"""
Puntos de entrada (Handlers) para AWS Lambda (Arquitectura 100% Serverless FaaS).

Adapta los 5 microservicios FastAPI mediante Mangum (Amazon API Gateway HTTP API v2)
y expone los procesadores asíncronos guiados por eventos:
  1. auth_handler          -> API Gateway (/api/auth*, /api/internal/users|notifications|conversations)
                              + acción interna {"_internal_action": "init_rds"} para sembrar RDS en VPC privada.
  2. graduates_handler     -> API Gateway (/api/modulo1*, /api/internal/graduates*, /api/internal/saved-searches)
  3. companies_handler     -> API Gateway (/api/modulo2*, /api/internal/companies*, /api/internal/jobs*, /api/internal/applications*)
  4. matchmaking_handler   -> Dual: API Gateway (/matching*, /health) + Trigger Amazon SQS (portal-matchmaking-queue)
  5. dashboard_handler     -> API Gateway (/api/dashboard*, ruta $default)
  6. cv_processor_handler  -> Trigger Amazon S3 (s3:ObjectCreated:* en bucket portal-cvs-*)
"""

import io
import json
import os
import re
import time
import urllib.parse
from urllib.parse import urlparse

_mangum_cache = {}


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
    Inicializa las 4 bases de datos (auth_db, graduates_db, companies_db, matchmaking_db)
    ejecutando init.sql directamente desde la subred privada hacia Amazon RDS PostgreSQL,
    sin requerir instancias EC2 ni tareas Fargate auxiliares.
    """
    import psycopg2
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

    # 1. Conectar a la BD administrativa 'postgres' y verificar si ya fue sembrada
    admin_conn = _connect_pg(cfg, "postgres")
    admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    existing_dbs = set()
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
        # Dividir init.sql por comandos psql '\c <nombre_bd>'
        parts = re.split(r"(?m)^\\c\s+(\w+)\s*$", raw_sql)
        # parts[0] = preámbulo CREATE DATABASE (ya ejecutado arriba)
        # Luego pares: (db_name, sql_block)
        for idx in range(1, len(parts), 2):
            target_db = parts[idx].strip()
            sql_block = parts[idx + 1]
            # Limpiar líneas vacías o solo comentarios para evitar bloques vacíos
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

    # Garantizar rol COORDINATOR, usuario coordinador@unicesar.edu.co y columnas Fase 6 en auth_db
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
    finally:
        auth_conn.close()

    # Sembrar encuestas longitudinales oficiales MEN / OLE / CNA (M0, M1, M5) y tablas nuevas en graduates_db
    grad_conn = _connect_pg(cfg, "graduates_db")
    grad_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    try:
        with grad_conn.cursor() as cur:
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS document_id VARCHAR(40);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS degree_act_number VARCHAR(60);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS diploma_number VARCHAR(60);")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'APPROVED';")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verification_notes TEXT;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verified_by_user_id INTEGER;")
            cur.execute("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;")
            cur.execute("UPDATE graduates SET verification_status = 'APPROVED' WHERE verification_status IS NULL;")
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
        from app.auth.main import app, startup_db_check
        startup_db_check()
        _mangum_cache["auth"] = Mangum(app, lifespan="off")

    return _mangum_cache["auth"](event, context)


# ── 2. Microservicio Graduates (Módulo 1) ────────────────────────────────────
def graduates_handler(event, context):
    if "graduates" not in _mangum_cache:
        from mangum import Mangum
        from app.graduates.main import app, ensure_graduates_schema
        ensure_graduates_schema()
        _mangum_cache["graduates"] = Mangum(app, lifespan="off")

    return _mangum_cache["graduates"](event, context)


# ── 3. Microservicio Companies (Módulo 2) ────────────────────────────────────
def companies_handler(event, context):
    if "companies" not in _mangum_cache:
        from mangum import Mangum
        from app.companies.main import app, ensure_companies_schema
        ensure_companies_schema()
        _mangum_cache["companies"] = Mangum(app, lifespan="off")

    return _mangum_cache["companies"](event, context)


# ── 4. Microservicio Matchmaking (Módulo 3: HTTP + Trigger Amazon SQS) ───────
def matchmaking_handler(event, context):
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
    if "matchmaking" not in _mangum_cache:
        from mangum import Mangum
        from app.matchmaking.main import app
        _mangum_cache["matchmaking"] = Mangum(app, lifespan="off")

    return _mangum_cache["matchmaking"](event, context)


# ── 5. Microservicio Dashboard & BI Analytics (Módulo 4) ─────────────────────
def dashboard_handler(event, context):
    if "dashboard" not in _mangum_cache:
        from mangum import Mangum
        from app.dashboard.main import app
        _mangum_cache["dashboard"] = Mangum(app, lifespan="off")

    return _mangum_cache["dashboard"](event, context)


# ── 6. Función Lambda Event-Driven: Procesador de CVs PDF desde Amazon S3 ────
def cv_processor_handler(event, context):
    """
    Se dispara automáticamente ante s3:ObjectCreated:* en el bucket portal-cvs-*.
    Descarga el PDF, extrae texto y competencias con pypdf, enriquece el perfil del
    egresado en graduates_db y encola el recálculo de afinidad en Amazon SQS.
    """
    import boto3
    import psycopg2
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

