from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
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

def log_audit_action(db: Session, user_id: int | None, action: str, target_id: str = None, details: dict = None, ip_address: str = None):
    try:
        audit = models.AuditLog(
            user_id=user_id,
            action=action,
            target_id=target_id,
            details=details,
            ip_address=ip_address
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        print(f"Error saving audit log: {e}")
        db.rollback()

def authenticate_user(body: schemas.LoginRequest, db: Session, client_ip: str = "unknown") -> schemas.TokenResponse:
    email_clean = body.email.strip().lower()
    user = db.query(models.User).filter(
        func.lower(models.User.email) == email_clean,
    ).first()

    if user and user.role_id == 3 and (not user.is_active or not user.email_verified):
        if not user.verification_token and not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta de egresado fue importada por la universidad y está inactiva. Ve a 'Regístrate gratis' con tu correo institucional para activar tu cuenta.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes activar tu cuenta desde el enlace enviado a tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
        )

    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
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
    
    # Registro de auditoría
    log_audit_action(db, user_id=user.id, action="LOGIN", ip_address=client_ip)
    
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserInfo(
            id=user.id,
            email=user.email,
            role_id=user.role_id,
            role_name=user.role.name,
            is_active=user.is_active,
            email_verified=user.email_verified,
            privacy_policy_accepted=user.privacy_policy_accepted,
            data_treatment_authorized=user.data_treatment_authorized,
        ),
    )

def validate_graduate_email(email: str, db: Session) -> dict:
    """Verifica si un correo institucional pertenece al censo oficial de egresados precargado en la base de datos."""
    email_clean = email.strip().lower()
    if not email_clean.endswith("@unicesar.edu.co"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes ingresar tu correo institucional @unicesar.edu.co"
        )

    user = db.query(models.User).filter(func.lower(models.User.email) == email_clean).first()
    if not user or user.role_id != 3:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tu correo institucional no se encuentra en la base de datos oficial de egresados de la UPC. Si eres egresado, solicita tu importación en la Oficina de Seguimiento a Egresados."
        )

    if user.is_active and user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tu cuenta de egresado ya se encuentra activa. Por favor inicia sesión directamente."
        )

    return {
        "valid": True,
        "message": "Egresado verificado en la base de datos oficial de la UPC.",
        "email": user.email
    }


def register_user(body: schemas.RegisterRequest, db: Session, client_ip: str = "unknown") -> dict:
    email_clean = body.email.strip().lower()
    existing_user = db.query(models.User).filter(func.lower(models.User.email) == email_clean).first()

    if not db.query(models.Role).filter(models.Role.id == body.role_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"El rol con id={body.role_id} no existe")

    verification_token = str(uuid.uuid4())

    # Si se intenta registrar como EGRESADO (role_id == 3), DEBE existir previamente
    # en la base de datos (inyectado en el despliegue o importado desde Excel por la UPC).
    if body.role_id == 3:
        if not existing_user or existing_user.role_id != 3:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tu correo institucional no se encuentra en la base de datos oficial de egresados de la UPC. Si eres egresado, solicita tu importación en la Oficina de Seguimiento a Egresados."
            )

        # Verificar también en el microservicio de Egresados que exista su registro en la tabla graduates
        try:
            from app.core.adapters import HttpGraduatesAdapter
            grad_profile = HttpGraduatesAdapter().get_graduate(existing_user.id)
            if not grad_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tu correo no registra ficha de egresado en el sistema. Comunícate con la Oficina de Egresados."
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Warning: No se pudo verificar perfil en microservicio Graduates: {e}")

        if existing_user.is_active and existing_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tu cuenta de egresado ya se encuentra activa. Por favor inicia sesión."
            )

        existing_user.password_hash = get_password_hash(body.password)
        existing_user.is_active = False
        existing_user.email_verified = False
        existing_user.verification_token = verification_token
        existing_user.privacy_policy_accepted = body.accept_privacy_policy
        existing_user.data_treatment_authorized = body.authorize_data_treatment
        existing_user.consent_version = "v1.0"
        existing_user.consent_date = func.now()
        existing_user.consent_ip = client_ip

        db.commit()
        db.refresh(existing_user)

        log_audit_action(
            db,
            user_id=existing_user.id,
            action="GRADUATE_ACTIVATION_REQUEST",
            details={"role_id": existing_user.role_id, "pre_imported": True},
            ip_address=client_ip
        )

        notifier = NotificationFactory.get_notifier("email")
        notifier.send_verification(existing_user.email, verification_token)

        return {
            "message": "Hemos validado tus datos como egresado en el sistema. Te enviamos un correo de activación para habilitar tu cuenta.",
            "user_id": existing_user.id
        }

    # Caso Empresa (role_id == 2) u otro rol:
    if existing_user:
        if not existing_user.email_verified or not existing_user.is_active:
            existing_user.password_hash = get_password_hash(body.password)
            existing_user.verification_token = verification_token
            existing_user.privacy_policy_accepted = body.accept_privacy_policy
            existing_user.data_treatment_authorized = body.authorize_data_treatment
            existing_user.consent_version = "v1.0"
            existing_user.consent_date = func.now()
            existing_user.consent_ip = client_ip
            db.commit()
            notifier = NotificationFactory.get_notifier("email")
            notifier.send_verification(existing_user.email, verification_token)
            return {
                "message": "Te hemos reenviado el correo de activación para habilitar tu cuenta.",
                "user_id": existing_user.id
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta activa con ese email. Por favor inicia sesión."
        )

    # Registro normal para nueva Empresa
    new_user = models.User(
        email=email_clean,
        password_hash=get_password_hash(body.password),
        role_id=body.role_id,
        is_active=False,
        email_verified=False,
        verification_token=verification_token,
        privacy_policy_accepted=body.accept_privacy_policy,
        data_treatment_authorized=body.authorize_data_treatment,
        consent_version="v1.0",
        consent_date=func.now(),
        consent_ip=client_ip
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Registro de auditoría
    log_audit_action(db, user_id=new_user.id, action="REGISTER", details={"role_id": body.role_id}, ip_address=client_ip)

    # Send verification email
    notifier = NotificationFactory.get_notifier("email")
    notifier.send_verification(new_user.email, verification_token)

    return {"message": "Usuario registrado exitosamente. Revisa tu correo para activar tu cuenta.", "user_id": new_user.id}

def verify_email(token: str, db: Session) -> dict:
    """Verifica el email y activa la cuenta del usuario usando su token de verificación."""
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación inválido o ya utilizado."
        )

    user.is_active = True
    user.email_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Cuenta activada y correo verificado exitosamente. Ya puedes iniciar sesión."}

def resend_verification(email: str, db: Session) -> dict:
    """Reenvía el correo de verificación."""
    user = db.query(models.User).filter(func.lower(models.User.email) == email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado")
    if user.email_verified and user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Esta cuenta ya fue verificada y activada")

    # Generate new token
    new_token = str(uuid.uuid4())
    user.verification_token = new_token
    db.commit()

    notifier = NotificationFactory.get_notifier("email")
    notifier.send_verification(user.email, new_token)
    return {"message": "Correo de activación reenviado exitosamente"}

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
    
    # Auditoria de impersonacion
    log_audit_action(db, user_id=admin_user.id, action="IMPERSONATE", target_id=str(target_user.id))
    
    return schemas.TokenResponse(
        access_token=new_token,
        token_type="bearer",
        user=schemas.UserInfo(
            id=target_user.id,
            email=target_user.email,
            role_id=target_user.role_id,
            role_name=target_user.role.name,
            is_active=target_user.is_active,
            email_verified=target_user.email_verified,
            privacy_policy_accepted=target_user.privacy_policy_accepted,
            data_treatment_authorized=target_user.data_treatment_authorized,
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
            is_active=u.is_active,
            email_verified=u.email_verified,
            privacy_policy_accepted=u.privacy_policy_accepted,
            data_treatment_authorized=u.data_treatment_authorized,
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


# ── Gestión de cuenta ────────────────────────────────────────────────────────
MIN_PASSWORD_LENGTH = 6


def _validate_new_password(password: str) -> None:
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres",
        )


def _validate_new_email(user: models.User, new_email: str, db: Session) -> str:
    new_email = new_email.strip().lower()
    taken = db.query(models.User).filter(
        func.lower(models.User.email) == new_email,
        models.User.id != user.id,
    ).first()
    if taken:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Ya existe un usuario con ese email")
    if user.role_id == 3:  # GRADUATE debe conservar el correo institucional
        domain = new_email.split("@")[-1]
        if domain not in schemas.ALLOWED_GRADUATE_EMAIL_DOMAINS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un egresado debe usar su correo institucional @unicesar.edu.co",
            )
    return new_email


def _build_user_info(user: models.User) -> schemas.UserInfo:
    return schemas.UserInfo(
        id=user.id,
        email=user.email,
        role_id=user.role_id,
        role_name=user.role.name,
        is_active=user.is_active,
        email_verified=user.email_verified,
        privacy_policy_accepted=user.privacy_policy_accepted,
        data_treatment_authorized=user.data_treatment_authorized,
    )


def _issue_token(user: models.User) -> str:
    return create_access_token(data={"sub": user.email, "id": user.id, "role_id": user.role_id})


def change_password(user: models.User, body: schemas.ChangePasswordRequest,
                    db: Session, client_ip: str = "unknown") -> dict:
    """Cambio de contraseña del propio usuario (exige la contraseña actual)."""
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La contraseña actual es incorrecta")
    _validate_new_password(body.new_password)
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La nueva contraseña debe ser distinta a la actual")

    user.password_hash = get_password_hash(body.new_password)
    user.password_reset_pin = None
    user.pin_expires_at = None
    db.commit()
    log_audit_action(db, user_id=user.id, action="CHANGE_PASSWORD", ip_address=client_ip)
    return {"message": "Contraseña actualizada exitosamente"}


def change_email(user: models.User, body: schemas.ChangeEmailRequest,
                 db: Session, client_ip: str = "unknown") -> schemas.AccountUpdateResponse:
    """Cambio del correo de acceso (solo empresas; exige la contraseña actual)."""
    if user.role_id != 2:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Solo las empresas pueden cambiar su correo de acceso")
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La contraseña actual es incorrecta")

    old_email = user.email
    new_email = _validate_new_email(user, body.new_email, db)
    if new_email == old_email.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="El nuevo correo es igual al actual")

    user.email = new_email
    db.commit()
    db.refresh(user)
    log_audit_action(db, user_id=user.id, action="CHANGE_EMAIL",
                     details={"old": old_email, "new": new_email}, ip_address=client_ip)
    return schemas.AccountUpdateResponse(
        message="Correo actualizado exitosamente",
        access_token=_issue_token(user),
        user=_build_user_info(user),
    )


def admin_update_user(admin_user: models.User, user_id: int, body: schemas.AdminUpdateUserRequest,
                      db: Session, client_ip: str = "unknown") -> schemas.AccountUpdateResponse:
    """El ADMIN puede cambiar correo y/o contraseña de cualquier usuario (incluido él mismo)."""
    if admin_user.role_id != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not body.email and not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Debes indicar un nuevo correo o una nueva contraseña")

    changes = []
    if body.email and body.email.strip().lower() != target.email.lower():
        target.email = _validate_new_email(target, body.email, db)
        changes.append("email")
    if body.password:
        _validate_new_password(body.password)
        target.password_hash = get_password_hash(body.password)
        target.password_reset_pin = None
        target.pin_expires_at = None
        changes.append("password")

    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No hay cambios que aplicar")

    db.commit()
    db.refresh(target)
    log_audit_action(db, user_id=admin_user.id, action="ADMIN_UPDATE_USER",
                     target_id=str(target.id), details={"fields": changes}, ip_address=client_ip)

    resp = schemas.AccountUpdateResponse(message="Usuario actualizado exitosamente")
    if target.id == admin_user.id and "email" in changes:
        resp.access_token = _issue_token(target)
        resp.user = _build_user_info(target)
    return resp


# ── Estado de microservicios ─────────────────────────────────────────────────
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import text

# (key, nombre, descripción, URL de healthcheck interna)
_SERVICES = [
    ("graduates",   "Egresados",      "Perfiles, CV y formación (Módulo 1)",
     os.getenv("GRADUATES_HEALTH_URL",   "http://graduates:8000/")),
    ("companies",   "Empresas",       "Empresas, vacantes y postulaciones (Módulo 2)",
     os.getenv("COMPANIES_HEALTH_URL",   "http://companies:8000/")),
    ("matchmaking", "Matchmaking",    "Afinidad y notificaciones en tiempo real",
     os.getenv("MATCHMAKING_HEALTH_URL", "http://matchmaking:8000/health")),
    ("dashboard",   "Dashboard",      "Indicadores administrativos (Módulo 4)",
     os.getenv("DASHBOARD_HEALTH_URL",   "http://dashboard:8000/")),
]
_SLOW_MS = 1500


def _probe(entry) -> schemas.ServiceStatus:
    key, name, description, url = entry
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            elapsed = int((time.perf_counter() - started) * 1000)
            code = resp.status
            state = "operational" if code < 400 and elapsed < _SLOW_MS else "degraded"
            detail = "Respuesta correcta" if state == "operational" else "Respuesta lenta"
            return schemas.ServiceStatus(key=key, name=name, description=description, status=state,
                                         latency_ms=elapsed, http_status=code, detail=detail)
    except urllib.error.HTTPError as e:
        elapsed = int((time.perf_counter() - started) * 1000)
        return schemas.ServiceStatus(key=key, name=name, description=description, status="degraded",
                                     latency_ms=elapsed, http_status=e.code, detail=f"HTTP {e.code}")
    except Exception as e:
        return schemas.ServiceStatus(key=key, name=name, description=description, status="down",
                                     detail=type(e).__name__ + ": " + str(getattr(e, "reason", e))[:120])


def get_system_status(admin_user: models.User, db: Session) -> schemas.SystemStatusResponse:
    if admin_user.role_id != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    # Auth (este servicio) + su base de datos
    started = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_ms = int((time.perf_counter() - started) * 1000)
        auth_status = schemas.ServiceStatus(
            key="auth", name="Autenticación", description="Login, usuarios y tokens JWT",
            status="operational", latency_ms=0, http_status=200, detail="Servicio en ejecución")
        db_status = schemas.ServiceStatus(
            key="database", name="Base de datos", description="PostgreSQL (auth_db)",
            status="operational" if db_ms < _SLOW_MS else "degraded",
            latency_ms=db_ms, detail="Conexión activa" if db_ms < _SLOW_MS else "Consulta lenta")
    except Exception as e:
        auth_status = schemas.ServiceStatus(
            key="auth", name="Autenticación", description="Login, usuarios y tokens JWT",
            status="degraded", detail="Servicio activo, sin acceso a la BD")
        db_status = schemas.ServiceStatus(
            key="database", name="Base de datos", description="PostgreSQL (auth_db)",
            status="down", detail=type(e).__name__)

    with ThreadPoolExecutor(max_workers=len(_SERVICES)) as pool:
        probed = list(pool.map(_probe, _SERVICES))

    services = [auth_status, *probed, db_status]
    states = {s.status for s in services}
    overall = "operational" if states == {"operational"} else (
        "down" if "down" in states and len(states) == 1 else "degraded")
    return schemas.SystemStatusResponse(overall=overall, checked_at=datetime.now(timezone.utc),
                                        services=services)
