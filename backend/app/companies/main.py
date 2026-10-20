from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.companies.controllers.catalog_controller import router as catalog_router
from app.companies.controllers.company_controller import router as company_router
from app.companies.controllers.job_offer_controller import router as job_offer_router
from app.companies.controllers.application_controller import router as application_router
from app.companies.controllers.event_controller import router as event_router
import app.companies.models
import app.auth.models  # Register User/Role models so FK to users.id resolves

app = FastAPI(
    title="Microservicio Módulo 2: Empresas y Vacantes",
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
        content={"detail": "Error interno en Empresas y Vacantes", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

from app.companies.internal_router import internal_router

app.include_router(catalog_router)
app.include_router(company_router)
app.include_router(job_offer_router)
app.include_router(application_router)
app.include_router(event_router)
app.include_router(internal_router)


import threading
from sqlalchemy import text
from app.database import engine

@app.on_event("startup")
def ensure_companies_schema():
    def _run():
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;"))
                conn.execute(text("""
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
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS event_registrations (
                        id SERIAL PRIMARY KEY,
                        event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                        graduate_id INT NOT NULL,
                        graduate_name VARCHAR(200),
                        graduate_email VARCHAR(200),
                        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_event_graduate UNIQUE(event_id, graduate_id)
                    );
                """))
        except Exception as e:
            print(f"Schema check warning in companies: {e}")
    threading.Thread(target=_run, daemon=True).start()

@app.get("/")
def health_check():
    return {"service": "companies", "status": "ok"}

@app.get("/health")
def health():
    return {"service": "companies", "status": "ok"}
