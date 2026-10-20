from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.database import engine

import app.auth.models  # noqa: F401 — registra los modelos en Base

app = FastAPI(
    title="Microservicio de Autenticación",
    description="Maneja login, registro, notificaciones push y validación de tokens JWT",
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
        content={"detail": "Error interno del servidor", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

from app.auth.controllers.auth_controller import router, internal_router
from app.auth.controllers.privacy_controller import router as privacy_router

app.include_router(router)
app.include_router(internal_router)
app.include_router(privacy_router)

@app.on_event("startup")
def startup_db_check():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSON;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(150);"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS device_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    token VARCHAR(512) UNIQUE NOT NULL,
                    platform VARCHAR(20) DEFAULT 'android',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    context_type VARCHAR(50) DEFAULT 'APPLICATION',
                    context_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    id SERIAL PRIMARY KEY,
                    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    last_read_at TIMESTAMP,
                    UNIQUE(conversation_id, user_id)
                );
            """))
            conn.execute(text("ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS id SERIAL;"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
                    body TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("Auth schema check & auto-migration completed successfully.")
    except Exception as e:
        print(f"Warning in auth schema check: {e}")

@app.get("/")
def health_check():
    return {"service": "auth", "status": "ok"}