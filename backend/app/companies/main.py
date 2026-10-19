from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.companies.controllers.catalog_controller import router as catalog_router
from app.companies.controllers.company_controller import router as company_router
from app.companies.controllers.job_offer_controller import router as job_offer_router
from app.companies.controllers.application_controller import router as application_router
import app.companies.models
import app.auth.models  # Register User/Role models so FK to users.id resolves

app = FastAPI(
    title="Microservicio Módulo 2: Empresas y Vacantes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.companies.internal_router import internal_router

app.include_router(catalog_router)
app.include_router(company_router)
app.include_router(job_offer_router)
app.include_router(application_router)
app.include_router(internal_router)


from sqlalchemy import text
from app.database import engine

@app.on_event("startup")
def ensure_companies_schema():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;"))
    except Exception as e:
        print(f"Schema check warning in companies: {e}")

@app.get("/")
def health_check():
    return {"service": "companies", "status": "ok"}