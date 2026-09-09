from fastapi import APIRouter, Depends, Query, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import schemas
from app.auth.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── POST /api/auth/login ─────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Recibe email + password y devuelve JWT."""
    return auth_service.authenticate_user(body, db)


# ── GET /api/auth/users ──────────────────────────────────────────────────────
@router.get("/users", response_model=List[schemas.UserInfo])
def get_all_users(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Devuelve la lista de todos los usuarios (Solo ADMIN)."""
    admin_user = auth_service.get_user_from_token(token, db)
    return auth_service.get_all_users(admin_user, db)


# ── POST /api/auth/impersonate ───────────────────────────────────────────────
@router.post("/impersonate", response_model=schemas.TokenResponse)
def impersonate(body: schemas.ImpersonateRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Permite a un admin generar un token para actuar como otro usuario."""
    admin_user = auth_service.get_user_from_token(token, db)
    return auth_service.impersonate_user(body, admin_user, db)


# ── POST /api/auth/register ──────────────────────────────────────────────────
@router.post("/register", response_model=schemas.RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Crea un nuevo usuario. Rol por defecto: COMPANY (role_id=2)."""
    return auth_service.register_user(body, db)


# ── GET /api/auth/verify ─────────────────────────────────────────────────────
@router.get("/verify")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    """Verifica el email del usuario usando el token enviado por correo."""
    result = auth_service.verify_email(token, db)
    return {"message": "Email verificado correctamente"}


# ── POST /api/auth/resend-verification ────────────────────────────────────────
@router.post("/resend-verification", response_model=schemas.MessageResponse)
def resend_verification(body: schemas.ResendVerificationRequest, db: Session = Depends(get_db)):
    """Reenvía el correo de verificación."""
    return auth_service.resend_verification(body.email, db)


# ── GET /api/auth/me ─────────────────────────────────────────────────────────
@router.get("/me", response_model=schemas.UserInfo)
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Devuelve la info del usuario autenticado."""
    user = auth_service.get_user_from_token(token, db)
    return schemas.UserInfo(
        id=user.id,
        email=user.email,
        role_id=user.role_id,
        role_name=user.role.name,
        email_verified=user.email_verified,
    )

# ── POST /api/auth/forgot-password ───────────────────────────────────────────
@router.post("/forgot-password", response_model=schemas.MessageResponse)
def forgot_password(body: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Genera un PIN de 6 dígitos para recuperación de contraseña."""
    return auth_service.forgot_password(body.email, db)

# ── POST /api/auth/verify-pin ────────────────────────────────────────────────
@router.post("/verify-pin", response_model=schemas.MessageResponse)
def verify_pin(body: schemas.VerifyPinRequest, db: Session = Depends(get_db)):
    """Verifica si el PIN es correcto y aún no ha expirado."""
    return auth_service.verify_pin(body.email, body.pin, db)

# ── POST /api/auth/reset-password ────────────────────────────────────────────
@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(body: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Restablece la contraseña utilizando un PIN válido."""
    return auth_service.reset_password(body.email, body.pin, body.new_password, db)

# ── NOTIFICATIONS ────────────────────────────────────────────────────────────
@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_my_notifications(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Devuelve las notificaciones del usuario autenticado."""
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    return db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50).all()

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    from fastapi import HTTPException
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notif.is_read = True
    db.commit()
    return {"message": "Notificación marcada como leída"}

from fastapi import APIRouter, HTTPException

internal_router = APIRouter(prefix="/api/internal", tags=["Internal"])

@internal_router.post("/users")
def create_user_internal(body: dict, db: Session = Depends(get_db)):
    from app.auth.models import User
    from app.auth.utils.auth_utils import get_password_hash
    
    email = body.get("email")
    password = body.get("password")
    role_id = body.get("role_id", 3)
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
        
    new_user = User(
        email=email,
        password_hash=get_password_hash(password),
        role_id=role_id,
        email_verified=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "role_id": new_user.role_id}
