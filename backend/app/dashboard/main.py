from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.dashboard.controllers.dashboard_controller import router as dashboard_router

import app.graduates.models
import app.auth.models
import app.companies.models

app = FastAPI(
    title="Microservicio Módulo 4: Dashboard Administrativo",
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
        content={"detail": "Error interno en Dashboard", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

app.include_router(dashboard_router)


@app.get("/")
def health_check():
    return {
        "service": "dashboard",
        "status": "ok"
    }
