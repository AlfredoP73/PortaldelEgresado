"""
Puntos de entrada (Handlers) para AWS Lambda (Arquitectura 100% Serverless FaaS).

Adapta los 5 microservicios FastAPI mediante Mangum (Amazon API Gateway HTTP API v2)
y expone los procesadores asíncronos guiados por eventos:
  1. auth_handler          -> API Gateway (/api/auth*, /api/internal/users|notifications|conversations)
                              + acción interna {"_internal_action": "init_rds"} para sembrar Aurora en VPC privada.
  2. graduates_handler     -> API Gateway (/api/modulo1*, /api/internal/graduates*, /api/internal/saved-searches)
  3. companies_handler     -> API Gateway (/api/modulo2*, /api/internal/companies*, /api/internal/jobs*, /api/internal/applications*)
  4. matchmaking_handler   -> Dual: API Gateway (/matching*, /health) + Trigger Amazon SQS (portal-lambda-matchmaking-queue)
  5. dashboard_handler     -> API Gateway (/api/dashboard*, ruta $default)
  6. cv_processor_handler  -> Trigger Amazon S3 (s3:ObjectCreated:* en bucket portal-lambda-cvs-*)

Incluye soporte nativo de Keep-Warm (Amazon EventBridge `{"_warmer": true}`) que
pre-carga FastAPI + SQLAlchemy + Mangum en memoria RAM y responde en < 1 ms sin abrir
conexiones innecesarias hacia PostgreSQL.
"""

import io
import json
import os
import re
import time
import urllib.parse
from urllib.parse import urlparse

_mangum_cache = {}


def _is_warmer_event(event) -> bool:
    if not isinstance(event, dict):
        return False
    return bool(event.get("_warmer") is True or event.get("source") == "aws.events")


def _parse_db_url(db_url: str) -> dict:
    parsed = urlparse(db_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": urllib.parse.unquote(parsed.username or "postgres"),
        "password": urllib.parse.unquote(parsed.password or ""),
        "dbname": (parsed.path or "/postgres").lstrip("/") or "postgres",
    }


def _connect_pg(cfg: dict, dbname: str, timeout: int = 25):
    """Conecta a Amazon Aurora PostgreSQL Serverless v2 absorbiendo la reanudación desde 0.0 ACUs."""
    import psycopg2
    last_exc = None
    for attempt in range(3):
        try:
            return psycopg2.connect(
                host=cfg["host"],
                port=cfg["port"],
                user=cfg["user"],
                password=cfg["password"],
                dbname=dbname,
                connect_timeout=timeout,
            )
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(2.5)
    raise last_exc


def _init_rds_from_sql() -> dict:
    """
    Inicializa y migra las 4 bases de datos (auth_db, graduates_db, companies_db, matchmaking_db)
    ejecutando init.sql y todas las tablas/columnas incrementales directamente desde la subred privada,
    eliminando consultas DDL repetitivas durante el arranque en frío (Cold Start) de las Lambdas.
    """
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"status": "error", "detail": "DATABASE_URL no configurada"}

    cfg = _parse_db_url(db_url)
    sql_path = os.path.join(os.getcwd(), "init.sql")
    if not os.path.exists(sql_path):
        sql_path = "/var/task/init.sql"
    if not os.path.exists(sql_path):
        return {"status": "error", "detail": f"No se encontró init.sql en {sql_path}"}

    with open(sql_path, "r", encoding="utf-8") as f:
        raw_sql = f.read()

    # 1. Conectar a la BD administrativa 'postgres' y crear las 4 bases lógicas si no existen
    admin_conn = _connect_pg(cfg, "postgres")
    admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    with admin_conn.cursor() as cur:
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
        existing_dbs = {row[0] for row in cur.fetchall()}

        for target_db in ("auth_db", "graduates_db", "companies_db", "matchmaking_db"):
            if target_db not in existing_dbs:
                cur.execute(f"CREATE DATABASE {target_db};")
    admin_conn.close()

    # Verificar si auth_db ya tiene la tabla users poblada (idempotencia)
    already_seeded = False
    check_conn = _connect_pg(cfg, "auth_db")
    check_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    with check_conn.cursor() as cur:
        cur.execute("SELECT to_regclass('public.users');")
        if cur.fetchone()[0] is not None:
            cur.execute("SELECT COUNT(*) FROM users;")
            already_seeded = (cur.fetchone()[0] or 0) > 0
    check_conn.close()

    executed_sections = []
    if not already_seeded:
        parts = re.split(r"(?m)^\\c\s+(\w+)\s*$", raw_sql)
        for idx in range(1, len(parts), 2):
            target_db = parts[idx].strip()
            sql_block = parts[idx + 1]
            cleaned_lines = [
                line for line in sql_block.splitlines()
                if not line.strip().startswith("\\")
            ]
            sql_text = "\n".join(cleaned_lines).strip()
            if not sql_text:
                continue

            conn = _connect_pg(cfg, target_db)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            try:
                with conn.cursor() as cur:
                    cur.execute(sql_text)
                executed_sections.append(target_db)
            finally:
                conn.close()

    # 2. Migraciones idempotentes de auth_db (COORDINATOR, mensajería, notificaciones push)
    auth_conn = _connect_pg(cfg, "auth_db")
    auth_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with auth_conn.cursor() as cur:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'APPROVED';")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;")
            cur.execute("UPDATE users SET verification_status = 'APPROVED' WHERE verification_status IS NULL;")
            cur.execute("INSERT INTO roles (id, name) VALUES (4, 'COORDINATOR') ON CONFLICT (id) DO NOTHING;")
            cur.execute("SELECT setval('roles_id_seq', GREATEST((SELECT COALESCE(MAX(id), 4) FROM roles), 4));")
            cur.execute("""
                INSERT INTO users (email, password_hash, role_id, is_active, email_verified, verification_status)
                VALUES (
                    'coordinador@unicesar.edu.co',
                    '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba',
                    4,
                    TRUE,
                    TRUE,
                    'APPROVED'
                )
                ON CONFLICT (email) DO NOTHING;
            """)
            cur.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSON;")
            cur.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;")
            cur.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(150);")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS device_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    token VARCHAR(512) UNIQUE NOT NULL,
                    platform VARCHAR(20) DEFAULT 'android',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    context_type VARCHAR(50) DEFAULT 'APPLICATION',
                    context_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    id SERIAL PRIMARY KEY,
                    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    last_read_at TIMESTAMP,
                    UNIQUE(conversation_id, user_id)
                );
            """)
            cur.execute("ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS id SERIAL;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
                    body TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
    finally:
        auth_conn.close()

    # 3. Migraciones idempotentes de graduates_db (verificación curricular, networking, copiloto IA, encuestas MEN/OLE/CNA)
    grad_conn = _connect_pg(cfg, "graduates_db")
    grad_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with grad_conn.cursor() as cur:
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'open_to_work';")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS preferred_modality VARCHAR(50) DEFAULT 'Cualquiera';")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_notice VARCHAR(50) DEFAULT 'Inmediata';")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS expected_salary INTEGER;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT TRUE;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS alert_min_score INTEGER DEFAULT 75;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS mentor_opt_in BOOLEAN DEFAULT FALSE;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN DEFAULT TRUE;")
            cur.execute("UPDATE graduates SET directory_visible = TRUE WHERE directory_visible IS NULL;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS document_id VARCHAR(40);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS degree_act_number VARCHAR(60);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS diploma_number VARCHAR(60);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'APPROVED';")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verification_notes TEXT;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verified_by_user_id INTEGER;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;")
            cur.execute("UPDATE graduates SET verification_status = 'APPROVED' WHERE verification_status IS NULL;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS saved_jobs (
                    id SERIAL PRIMARY KEY,
                    graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    job_offer_id INTEGER NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS saved_searches (
                    id SERIAL PRIMARY KEY,
                    graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    filters_json JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS mentor_profiles (
                    graduate_id INTEGER PRIMARY KEY REFERENCES graduates(user_id) ON DELETE CASCADE,
                    headline VARCHAR(200),
                    bio TEXT,
                    areas_json JSON,
                    max_mentees INTEGER DEFAULT 3,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS mentorship_requests (
                    id SERIAL PRIMARY KEY,
                    mentee_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    mentor_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    message TEXT NOT NULL,
                    goal VARCHAR(200),
                    status VARCHAR(50) DEFAULT 'PENDING',
                    conversation_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS graduate_projects (
                    id SERIAL PRIMARY KEY,
                    graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    project_url VARCHAR(500),
                    repository_url VARCHAR(500),
                    image_url VARCHAR(500),
                    technologies VARCHAR(300),
                    resource_type VARCHAR(50),
                    resource_url VARCHAR(500),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("ALTER TABLE graduate_projects ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);")
            cur.execute("ALTER TABLE graduate_projects ADD COLUMN IF NOT EXISTS resource_url VARCHAR(500);")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS graduate_connections (
                    id SERIAL PRIMARY KEY,
                    requester_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    addressee_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_graduate_connection UNIQUE(requester_id, addressee_id)
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ai_coach_sessions (
                    id SERIAL PRIMARY KEY,
                    graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    title VARCHAR(200) NOT NULL DEFAULT 'Nueva conversación',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ai_coach_messages (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES ai_coach_sessions(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS moment_code VARCHAR(20) DEFAULT 'M1';")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS category VARCHAR(120) DEFAULT 'Empleabilidad y Pertinencia (OLE/CNA)';")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_program_id INTEGER;")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_graduation_year INTEGER;")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS closes_at DATE;")
            cur.execute("ALTER TABLE surveys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
            cur.execute("SELECT COUNT(*) FROM surveys;")
            count_surveys = cur.fetchone()[0] or 0
            if count_surveys == 0:
                from app.graduates.services.survey_templates import OFFICIAL_SURVEY_TEMPLATES
                for tpl in OFFICIAL_SURVEY_TEMPLATES:
                    if tpl["moment_code"] in ("M0", "M1", "M5"):
                        cur.execute(
                            """
                            INSERT INTO surveys (title, description, moment_code, category, is_mandatory, questions_json, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s::jsonb, TRUE);
                            """,
                            (
                                tpl["title"],
                                tpl["description"],
                                tpl["moment_code"],
                                tpl["category"],
                                tpl["is_mandatory"],
                                json.dumps(tpl["questions_json"], ensure_ascii=False),
                            ),
                        )
    finally:
        grad_conn.close()

    # 4. Migraciones idempotentes de companies_db (postulaciones y eventos institucionales)
    comp_conn = _connect_pg(cfg, "companies_db")
    comp_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with comp_conn.cursor() as cur:
            cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    organizer_user_id INT NOT NULL,
                    organizer_role VARCHAR(50) DEFAULT 'COMPANY',
                    organizer_name VARCHAR(200),
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    modality VARCHAR(50) DEFAULT 'VIRTUAL',
                    location_or_url VARCHAR(500),
                    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    capacity INT,
                    status VARCHAR(50) DEFAULT 'PUBLISHED',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS event_registrations (
                    id SERIAL PRIMARY KEY,
                    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    graduate_id INT NOT NULL,
                    graduate_name VARCHAR(200),
                    graduate_email VARCHAR(200),
                    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_event_graduate UNIQUE(event_id, graduate_id)
                );
            """)
            cur.execute("""
                INSERT INTO events (organizer_user_id, organizer_role, organizer_name, title, description, modality, location_or_url, starts_at, ends_at, capacity, status)
                SELECT 1, 'ADMIN', 'Universidad Popular del Cesar', 'Feria de Empleabilidad y Pasantías UPC 2026', 'Encuentro anual de empleabilidad donde más de 30 empresas aliadas del sector tecnológico, agroindustrial y financiero ofertan vacantes exclusivas para egresados UPC.', 'HIBRIDO', 'Auditorio Sabanas / Virtual', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 4 hours', 250, 'PUBLISHED'
                WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Feria de Empleabilidad y Pasantías UPC 2026');
            """)
            cur.execute("""
                INSERT INTO events (organizer_user_id, organizer_role, organizer_name, title, description, modality, location_or_url, starts_at, ends_at, capacity, status)
                SELECT 1, 'COMPANY', 'TechCaribe Solutions', 'Bootcamp Tech: Cloud Computing, Microservicios y DevOps en AWS', 'Taller práctico intensivo sobre despliegue de microservicios Serverless con AWS Lambda, Aurora y monitoreo en la nube orientado a egresados de Ingeniería de Sistemas.', 'VIRTUAL', 'https://meet.google.com/upc-tech-2026', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 3 hours', 150, 'PUBLISHED'
                WHERE NOT EXISTS (SELECT 1 FROM events WHERE title LIKE 'Bootcamp Tech%');
            """)
            cur.execute("""
                INSERT INTO events (organizer_user_id, organizer_role, organizer_name, title, description, modality, location_or_url, starts_at, ends_at, capacity, status)
                SELECT 1, 'ADMIN', 'Coordinación de Egresados UPC', 'Masterclass: Optimización de CV de Alto Impacto y Entrevistas Técnicas', 'Aprende cómo estructurar tu perfil profesional, destacar proyectos reales y superar pruebas técnicas en procesos de selección nacionales e internacionales.', 'VIRTUAL', 'https://zoom.us/j/upc-masterclass', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days 2 hours', 200, 'PUBLISHED'
                WHERE NOT EXISTS (SELECT 1 FROM events WHERE title LIKE 'Masterclass: Optimización%');
            """)
            cur.execute("""
                INSERT INTO events (organizer_user_id, organizer_role, organizer_name, title, description, modality, location_or_url, starts_at, ends_at, capacity, status)
                SELECT 1, 'COMPANY', 'Bancolombia Talento', 'Rueda de Empleo Sector Financiero y Fintech', 'Convocatoria abierta para profesionales en Administración, Economía, Contaduría e Ingeniería con vacantes de analista y liderazgo.', 'PRESENCIAL', 'Sede Hurtado UPC - Salón de Eventos', NOW() + INTERVAL '18 days', NOW() + INTERVAL '18 days 5 hours', 100, 'PUBLISHED'
                WHERE NOT EXISTS (SELECT 1 FROM events WHERE title LIKE 'Rueda de Empleo%');
            """)
    finally:
        comp_conn.close()

    return {
        "status": "ok",
        "already_seeded": already_seeded,
        "executed_sections": executed_sections,
    }


# ── 1. Microservicio Auth ────────────────────────────────────────────────────
def auth_handler(event, context):
    if isinstance(event, dict) and event.get("_internal_action") == "init_rds":
        return _init_rds_from_sql()

    if "auth" not in _mangum_cache:
        from mangum import Mangum
        from app.auth.main import app
        _mangum_cache["auth"] = Mangum(app, lifespan="off")

    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "auth"}

    return _mangum_cache["auth"](event, context)


# ── 2. Microservicio Graduates (Módulo 1) ────────────────────────────────────
def graduates_handler(event, context):
    if "graduates" not in _mangum_cache:
        from mangum import Mangum
        from app.graduates.main import app
        _mangum_cache["graduates"] = Mangum(app, lifespan="off")

    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "graduates"}

    return _mangum_cache["graduates"](event, context)


# ── 3. Microservicio Companies (Módulo 2) ────────────────────────────────────
def companies_handler(event, context):
    if "companies" not in _mangum_cache:
        from mangum import Mangum
        from app.companies.main import app
        _mangum_cache["companies"] = Mangum(app, lifespan="off")

    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "companies"}

    return _mangum_cache["companies"](event, context)


# ── 4. Microservicio Matchmaking (Módulo 3: HTTP + Trigger Amazon SQS) ───────
def matchmaking_handler(event, context):
    if "matchmaking" not in _mangum_cache:
        from mangum import Mangum
        from app.matchmaking.main import app
        _mangum_cache["matchmaking"] = Mangum(app, lifespan="off")

    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "matchmaking"}

    # Modo Asíncrono: Invocación desde Amazon SQS (Event Source Mapping)
    if isinstance(event, dict) and "Records" in event:
        records = event.get("Records") or []
        if records and records[0].get("eventSource") == "aws:sqs":
            from app.database import SessionLocal
            from app.matchmaking.services import matching_service

            processed = 0
            for rec in records:
                db = SessionLocal()
                try:
                    body = json.loads(rec.get("body") or "{}")
                    if "graduate_id" in body and body["graduate_id"] is not None:
                        matching_service.recalcular_por_egresado(db, int(body["graduate_id"]))
                    if "job_offer_id" in body and body["job_offer_id"] is not None:
                        matching_service.recalcular_por_vacante(db, int(body["job_offer_id"]))
                    processed += 1
                except Exception as exc:
                    print(f"Error procesando evento SQS en matchmaking_handler: {exc}")
                    raise
                finally:
                    db.close()
            return {"status": "ok", "sqs_processed": processed}

    # Modo Síncrono: Petición HTTP desde Amazon API Gateway v2
    return _mangum_cache["matchmaking"](event, context)


# ── 5. Microservicio Dashboard & BI Analytics (Módulo 4) ─────────────────────
def dashboard_handler(event, context):
    if "dashboard" not in _mangum_cache:
        from mangum import Mangum
        from app.dashboard.main import app
        _mangum_cache["dashboard"] = Mangum(app, lifespan="off")

    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "dashboard"}

    return _mangum_cache["dashboard"](event, context)


# ── 6. Función Lambda Event-Driven: Procesador de CVs PDF desde Amazon S3 ────
def cv_processor_handler(event, context):
    """
    Se dispara automáticamente ante s3:ObjectCreated:* en el bucket portal-lambda-cvs-*.
    Descarga el PDF, extrae texto y competencias con pypdf, enriquece el perfil del
    egresado en graduates_db y encola el recálculo de afinidad en Amazon SQS.
    """
    if _is_warmer_event(event):
        return {"statusCode": 200, "warm": True, "service": "cv-processor"}

    import boto3
    from pypdf import PdfReader

    s3 = boto3.client("s3")
    db_url = os.getenv("DATABASE_URL", "")
    sqs_url = os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"

    records = (event or {}).get("Records", [])
    results = []

    for rec in records:
        s3_info = rec.get("s3", {})
        bucket = s3_info.get("bucket", {}).get("name")
        raw_key = s3_info.get("object", {}).get("key", "")
        key = urllib.parse.unquote_plus(raw_key)
        if not bucket or not key or not key.lower().endswith(".pdf"):
            continue

        obj = s3.get_object(Bucket=bucket, Key=key)
        pdf_bytes = obj["Body"].read()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        extracted_text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        lowered = extracted_text.lower()

        if not db_url or not extracted_text:
            results.append({"key": key, "chars": len(extracted_text), "matched_graduate": None})
            continue

        cfg = _parse_db_url(db_url)
        conn = _connect_pg(cfg, cfg["dbname"])
        try:
            grad_user_id = None
            added_skills = []
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT user_id, profile_summary FROM graduates WHERE cv_url LIKE %s LIMIT 1;",
                        (f"%{key}",),
                    )
                    row = cur.fetchone()
                    if row:
                        grad_user_id, current_summary = row[0], row[1]
                        cur.execute("SELECT id, name FROM skills;")
                        all_skills = cur.fetchall()
                        for sk_id, sk_name in all_skills:
                            if sk_name and re.search(r"\b" + re.escape(sk_name.lower()) + r"\b", lowered):
                                cur.execute(
                                    """
                                    INSERT INTO graduate_skills (graduate_id, skill_id, proficiency_level)
                                    VALUES (%s, %s, 'Intermedio')
                                    ON CONFLICT DO NOTHING;
                                    """,
                                    (grad_user_id, sk_id),
                                )
                                added_skills.append(sk_name)

                        if not current_summary or current_summary.strip() in ("", "Perfil generado"):
                            snippet = re.sub(r"\s+", " ", extracted_text)[:280]
                            cur.execute(
                                "UPDATE graduates SET profile_summary = %s WHERE user_id = %s;",
                                (snippet, grad_user_id),
                            )

            if grad_user_id and sqs_url:
                from botocore.config import Config
                dualstack_sqs_url = sqs_url.replace(f"sqs.{region}.amazonaws.com", f"sqs.{region}.api.aws")
                sqs = boto3.client("sqs", region_name=region, config=Config(use_dualstack_endpoint=True))
                sqs.send_message(
                    QueueUrl=dualstack_sqs_url,
                    MessageBody=json.dumps({"graduate_id": grad_user_id}),
                )

            results.append({
                "key": key,
                "matched_graduate": grad_user_id,
                "detected_skills": added_skills,
            })
        finally:
            conn.close()

    return {"status": "ok", "processed": results}
