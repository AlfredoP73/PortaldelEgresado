from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os
import uuid
import random
from datetime import datetime, timedelta, timezone

from app.auth import models, schemas
from app.auth.utils.auth_utils import verify_password, get_password_hash, create_access_token
from app.auth.services.notification_factory import NotificationFactory

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")

def get_user_from_token(token: str, db: Session) -> models.User:
    """Resuelve el JWT y devuelve el User de la BD o lanza 401."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub", "")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token inválido o expirado",
                            headers={"WWW-Authenticate": "Bearer"})
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado")
    return user

def authenticate_user(body: schemas.LoginRequest, db: Session) -> schemas.TokenResponse:
    user = db.query(models.User).filter(
        models.User.email == body.email,
        models.User.is_active == True,
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check email verification
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
        )

    # Limpiar PIN de recuperación si existe (buena higiene de datos)
    if user.password_reset_pin is not None:
        user.password_reset_pin = None
        user.pin_expires_at = None
        db.commit()

    data_payload = {
        "sub": user.email,
        "id": user.id,
        "role_id": user.role_id
    }
    token = create_access_token(data=data_payload)
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserInfo(
            id=user.id,
            email=user.email,
            role_id=user.role_id,
            role_name=user.role.name,
            email_verified=user.email_verified,
        ),
    )

def register_user(body: schemas.RegisterRequest, db: Session) -> dict:
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Ya existe un usuario con ese email")

    if not db.query(models.Role).filter(models.Role.id == body.role_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"El rol con id={body.role_id} no existe")

    verification_token = str(uuid.uuid4())

    new_user = models.User(
        email=body.email,
        password_hash=get_password_hash(body.password),
        role_id=body.role_id,
        email_verified=False,
        verification_token=verification_token,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email
    notifier = NotificationFactory.get_notifier("email")
    notifier.send_verification(body.email, verification_token)

    return {"message": "Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.", "user_id": new_user.id}

def verify_email(token: str, db: Session) -> dict:
    """Verifica el email de un usuario usando su token de verificación."""
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación inválido o ya utilizado."
        )

    user.email_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Correo verificado exitosamente. Ya puedes iniciar sesión."}

def resend_verification(email: str, db: Session) -> dict:
    """Reenvía el correo de verificación."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado")
    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Este correo ya fue verificado")

    # Generate new token
    new_token = str(uuid.uuid4())
    user.verification_token = new_token
    db.commit()

    notifier = NotificationFactory.get_notifier("email")
    notifier.send_verification(email, new_token)
    return {"message": "Correo de verificación reenviado exitosamente"}

def impersonate_user(body: schemas.ImpersonateRequest, admin_user: models.User, db: Session) -> schemas.TokenResponse:
    if admin_user.role_id != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden impersonar")
        
    target_user = db.query(models.User).filter(models.User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario objetivo no encontrado")
        
    data_payload = {
        "sub": target_user.email,
        "id": target_user.id,
        "role_id": target_user.role_id
    }
    new_token = create_access_token(data=data_payload)
    return schemas.TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=schemas.UserInfo(
            id=target_user.id,
            email=target_user.email,
            role_id=target_user.role_id,
            role_name=target_user.role.name,
            email_verified=target_user.email_verified,
        ),
    )

def get_all_users(admin_user: models.User, db: Session) -> list[schemas.UserInfo]:
    if admin_user.role_id != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
        
    users = db.query(models.User).all()
    return [
        schemas.UserInfo(
            id=u.id,
            email=u.email,
            role_id=u.role_id,
            role_name=u.role.name,
            email_verified=u.email_verified,
        )
        for u in users
    ]

def forgot_password(email: str, db: Session) -> dict:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Por seguridad no revelamos que no existe, pero para este caso devolveremos OK
        return {"message": "Si el correo está registrado, recibirás un PIN de recuperación."}

    # Generar PIN numérico de 6 dígitos
    pin = f"{random.randint(100000, 999999)}"
    
    user.password_reset_pin = pin
    user.pin_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    notifier = NotificationFactory.get_notifier("email")
    notifier.send_password_reset_pin(email, pin)

    return {"message": "Si el correo está registrado, recibirás un PIN de recuperación."}

def verify_pin(email: str, pin: str, db: Session) -> dict:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not user.password_reset_pin or user.password_reset_pin != pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN incorrecto")

    if user.pin_expires_at and user.pin_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El PIN ha expirado")

    return {"message": "PIN verificado correctamente"}

def reset_password(email: str, pin: str, new_password: str, db: Session) -> dict:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not user.password_reset_pin or user.password_reset_pin != pin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN incorrecto")

    if user.pin_expires_at and user.pin_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El PIN ha expirado")

    user.password_hash = get_password_hash(new_password)
    user.password_reset_pin = None
    user.pin_expires_at = None
    db.commit()

    return {"message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión."}
