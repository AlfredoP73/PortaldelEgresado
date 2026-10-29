from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.graduates.controllers.graduate_controller import router as graduate_router, public_router as graduate_public_router, internal_router
from app.graduates.controllers.experience_controller import router as experience_router
from app.graduates.controllers.education_controller import router as education_router
from app.graduates.controllers.misc_controller import router as misc_router
from app.graduates.controllers.ai_copilot_controller import router as ai_copilot_router
import app.graduates.models

app = FastAPI(
    title="Microservicio Módulo 1: Egresados",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno en Egresados", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

app.include_router(graduate_router)
app.include_router(graduate_public_router)
app.include_router(internal_router)
app.include_router(experience_router)
app.include_router(education_router)
app.include_router(misc_router)
app.include_router(ai_copilot_router)

os.makedirs("uploads/cvs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

import threading
from sqlalchemy import text
from app.database import engine

@app.on_event("startup")
def ensure_graduates_schema():
    def _run():
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'open_to_work';"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS preferred_modality VARCHAR(50) DEFAULT 'Cualquiera';"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_notice VARCHAR(50) DEFAULT 'Inmediata';"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS expected_salary INTEGER;"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS alert_min_score INTEGER DEFAULT 75;"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS mentor_opt_in BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("UPDATE graduates SET directory_visible = TRUE WHERE directory_visible IS NULL;"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS saved_jobs (
                        id SERIAL PRIMARY KEY,
                        graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                        job_offer_id INTEGER NOT NULL,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS saved_searches (
                        id SERIAL PRIMARY KEY,
                        graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                        name VARCHAR(100) NOT NULL,
                        filters_json JSON NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS mentor_profiles (
                        graduate_id INTEGER PRIMARY KEY REFERENCES graduates(user_id) ON DELETE CASCADE,
                        headline VARCHAR(200),
                        bio TEXT,
                        areas_json JSON,
                        max_mentees INTEGER DEFAULT 3,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
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
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS graduate_projects (
                        id SERIAL PRIMARY KEY,
                        graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                        title VARCHAR(200) NOT NULL,
                        description TEXT,
                        project_url VARCHAR(500),
                        repository_url VARCHAR(500),
                        image_url VARCHAR(500),
                        technologies VARCHAR(300),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
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
                """))
                conn.execute(text("ALTER TABLE graduate_projects ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);"))
                conn.execute(text("ALTER TABLE graduate_projects ADD COLUMN IF NOT EXISTS resource_url VARCHAR(500);"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS ai_coach_sessions (
                        id SERIAL PRIMARY KEY,
                        graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                        title VARCHAR(200) NOT NULL DEFAULT 'Nueva conversación',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS ai_coach_messages (
                        id SERIAL PRIMARY KEY,
                        session_id INTEGER NOT NULL REFERENCES ai_coach_sessions(id) ON DELETE CASCADE,
                        role VARCHAR(20) NOT NULL,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                print("Graduates schema check completed successfully.")
        except Exception as e:
            print(f"Schema check warning in graduates: {e}")
    threading.Thread(target=_run, daemon=True).start()

@app.get("/")
def health_check():
    return {"service": "graduates", "status": "ok"}

@app.get("/health")
def health():
    return {"service": "graduates", "status": "ok"}
