from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.controllers.auth_controller import router
import app.auth.models  # noqa: F401 — registra los modelos en Base

app = FastAPI(
    title="Microservicio de Autenticación",
    description="Maneja login, registro y validación de tokens JWT",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth.controllers.auth_controller import router, internal_router

app.include_router(router)
app.include_router(internal_router)


@app.get("/")
def health_check():
    return {"service": "auth", "status": "ok"}