from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.services.auth_service import get_user_from_token, log_audit_action
from app.auth.controllers.auth_controller import oauth2_scheme
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api/auth/privacy", tags=["Privacidad y Habeas Data"])

class RevokeConsentRequest(BaseModel):
    reason: str = "Sin especificar"

class PqrsRequest(BaseModel):
    subject: str
    message: str

@router.post("/revoke", status_code=status.HTTP_200_OK)
def revoke_consent(request: Request, body: RevokeConsentRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Revoca la autorización de tratamiento de datos. Realiza un soft delete ocultando al usuario."""
    user = get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    
    user.data_treatment_authorized = False
    user.is_active = False # Soft delete / desactivación
    db.commit()
    
    log_audit_action(db, user_id=user.id, action="REVOKE_CONSENT", details={"reason": body.reason}, ip_address=client_ip)
    
    return {"message": "Has revocado la autorización de tratamiento de datos. Tu cuenta ha sido desactivada y tus datos ya no son visibles."}

@router.post("/delete-account", status_code=status.HTTP_200_OK)
def request_account_deletion(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Solicita la supresión de los datos (Soft Delete anonimizado)."""
    user = get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    
    # En un Soft Delete, anonimizamos el correo pero mantenemos el ID para integridad referencial de estadísticas
    original_email = user.email
    user.email = f"eliminado_{user.id}@anon.local"
    user.password_hash = "DELETED"
    user.is_active = False
    user.data_treatment_authorized = False
    db.commit()
    
    log_audit_action(db, user_id=user.id, action="DELETE_ACCOUNT", details={"original_email": original_email}, ip_address=client_ip)
    
    return {"message": "Tu cuenta y datos personales han sido suprimidos del sistema conforme a la ley."}

@router.post("/pqrs", status_code=status.HTTP_201_CREATED)
def submit_privacy_pqrs(request: Request, body: PqrsRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Canal de consultas y reclamos sobre protección de datos."""
    user = get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    
    # Guardamos la consulta como un registro de auditoría o en una tabla PQRS. Aquí usamos audit log por simplicidad.
    log_audit_action(db, user_id=user.id, action="PQRS_SUBMITTED", details={"subject": body.subject, "message": body.message}, ip_address=client_ip)
    
    return {"message": "Tu solicitud ha sido recibida y será procesada en los tiempos establecidos por la ley."}

@router.post("/accept-policy", status_code=status.HTTP_200_OK)
def accept_policy(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Permite a usuarios antiguos aceptar las políticas de privacidad para seguir usando la app."""
    from sqlalchemy.sql import func
    user = get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    
    user.privacy_policy_accepted = True
    user.data_treatment_authorized = True
    user.consent_date = func.now()
    user.consent_version = "v1.0"
    user.consent_ip = client_ip
    user.is_active = True
    db.commit()
    
    log_audit_action(db, user_id=user.id, action="ACCEPT_POLICY", ip_address=client_ip)
    return {"message": "Políticas de privacidad aceptadas exitosamente."}
