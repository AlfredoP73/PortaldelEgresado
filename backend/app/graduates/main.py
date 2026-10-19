from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.graduates.controllers.graduate_controller import router as graduate_router, public_router as graduate_public_router, internal_router
from app.graduates.controllers.experience_controller import router as experience_router
from app.graduates.controllers.education_controller import router as education_router
from app.graduates.controllers.misc_controller import router as misc_router
import app.graduates.models

app = FastAPI(
    title="Microservicio Módulo 1: Egresados",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graduate_router)
app.include_router(graduate_public_router)
app.include_router(internal_router)
app.include_router(experience_router)
app.include_router(education_router)
app.include_router(misc_router)

os.makedirs("uploads/cvs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from sqlalchemy import text
from app.database import engine

@app.on_event("startup")
def ensure_graduates_schema():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'open_to_work';"))
            conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS preferred_modality VARCHAR(50) DEFAULT 'Cualquiera';"))
            conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS availability_notice VARCHAR(50) DEFAULT 'Inmediata';"))
            conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS expected_salary INTEGER;"))
            conn.execute(text("ALTER TABLE graduates ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT TRUE;"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS saved_jobs (
                    id SERIAL PRIMARY KEY,
                    graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                    job_offer_id INTEGER NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
    except Exception as e:
        print(f"Schema check warning in graduates: {e}")

@app.get("/")
def health_check():
    return {"service": "graduates", "status": "ok"}
