"""
push_service.py — Envío de notificaciones push móviles mediante Firebase Cloud Messaging (FCM).
Soporta:
1. Archivo directo 'firebase-service-account.json' en la raíz de backend o /app.
2. Variable de entorno 'FCM_SERVICE_ACCOUNT_B64' (Base64 codificado para ECS/Fargate).
3. 'GOOGLE_APPLICATION_CREDENTIALS'.
"""
import os
import json
import base64
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger("PushService")

_firebase_app_initialized = False

def _init_firebase():
    global _firebase_app_initialized
    if _firebase_app_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # 1. Intentar variable de entorno Base64 (ideal para contenedores en la nube)
        b64_cred = os.getenv("FCM_SERVICE_ACCOUNT_B64")
        if b64_cred:
            cred_dict = json.loads(base64.b64decode(b64_cred).decode("utf-8"))
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_app_initialized = True
            logger.info("Firebase Admin SDK inicializado exitosamente desde FCM_SERVICE_ACCOUNT_B64")
            return True

        # 2. Intentar archivo físico local
        possible_paths = [
            os.path.join(os.getcwd(), "firebase-service-account.json"),
            os.path.join(os.getcwd(), "app", "firebase-service-account.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "firebase-service-account.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "firebase-service-account.json"),
            "/app/firebase-service-account.json",
            "/app/app/firebase-service-account.json",
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        ]

        for p in possible_paths:
            if p and os.path.isfile(p):
                cred = credentials.Certificate(p)
                firebase_admin.initialize_app(cred)
                _firebase_app_initialized = True
                logger.info(f"Firebase Admin SDK inicializado exitosamente desde: {p}")
                return True

        logger.warning("No se encontró credencial de Firebase (FCM_SERVICE_ACCOUNT_B64 o firebase-service-account.json). Push desactivado temporalmente.")
        return False
    except Exception as e:
        logger.error(f"Error inicializando Firebase Admin SDK: {e}")
        return False


def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> bool:
    """Envía una notificación push a un único token de dispositivo."""
    if not _init_firebase():
        return False

    try:
        from firebase_admin import messaging

        str_data = {}
        if data:
            for k, v in data.items():
                str_data[str(k)] = str(v)

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=str_data,
            token=token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="portal_egresados_alerts",
                ),
            ),
        )
        response = messaging.send(message)
        logger.info(f"Push enviado con éxito: {response}")
        return True
    except Exception as e:
        logger.error(f"Fallo al enviar push a token {token[:12]}...: {e}")
        return False


def send_multicast_push(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> int:
    """Envía notificación push en lote a múltiples tokens. Devuelve la cantidad exitosa."""
    if not tokens or not _init_firebase():
        return 0

    success_count = 0
    for tok in set(tokens):
        if send_push_notification(tok, title, body, data):
            success_count += 1
    return success_count

