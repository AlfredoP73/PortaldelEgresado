"""
Cliente HTTP para disparar el recálculo del matchmaking (Módulo 3).

Los microservicios companies y graduates lo usan después de crear/editar
una vacante o actualizar el perfil de un egresado, para que el motor de
compatibilidad recalcule las afinidades afectadas.
"""

import os
from typing import Optional

import httpx

MATCHMAKING_URL = os.getenv("MATCHMAKING_URL", "http://matchmaking:8000")
INTERNAL_TOKEN = os.getenv("MATCHMAKING_INTERNAL_TOKEN", "token_interno_servicios")


def trigger_recalcular(
    graduate_id: Optional[int] = None,
    job_offer_id: Optional[int] = None,
    timeout: float = 15.0,
) -> bool:
    """
    Dispara el recálculo de afinidades:
    - Si SQS_MATCHMAKING_QUEUE_URL está configurada (AWS Serverless / Lambda), publica asíncronamente en Amazon SQS.
    - De lo contrario (o como fallback), invoca POST /matching/recalcular vía HTTP.
    """
    payload: dict = {}
    if graduate_id is not None:
        payload["graduate_id"] = graduate_id
    if job_offer_id is not None:
        payload["job_offer_id"] = job_offer_id
    if not payload:
        return False

    sqs_url = os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()
    if sqs_url:
        try:
            from app.core.adapters import SQSMatchmakingAdapter
            if SQSMatchmakingAdapter(sqs_url).trigger_recalculate(
                graduate_id=graduate_id,
                job_offer_id=job_offer_id,
            ):
                return True
        except Exception as e:
            print(f"SQS publish fallback to HTTP in trigger_recalcular: {e}")

    matchmaking_url = os.getenv("MATCHMAKING_URL", MATCHMAKING_URL)
    internal_token = os.getenv("MATCHMAKING_INTERNAL_TOKEN", INTERNAL_TOKEN)
    try:
        resp = httpx.post(
            f"{matchmaking_url}/matching/recalcular",
            json=payload,
            headers={"X-Internal-Token": internal_token},
            timeout=timeout,
        )
        resp.raise_for_status()
        return True
    except httpx.HTTPError:
        # No debe romper el flujo principal si el matchmaking no está disponible.
        return False