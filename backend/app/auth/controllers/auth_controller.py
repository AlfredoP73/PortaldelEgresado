from fastapi import APIRouter, Depends, Query, status, Request
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
def login(request: Request, body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Recibe email + password y devuelve JWT."""
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.authenticate_user(body, db, client_ip)


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


# ── POST /api/auth/validate-graduate-email ──────────────────────────────────
@router.post("/validate-graduate-email", response_model=schemas.ValidateGraduateEmailResponse)
def validate_graduate_email(body: schemas.ValidateGraduateEmailRequest, db: Session = Depends(get_db)):
    """Verifica si un correo institucional pertenece a la base de datos oficial de egresados precargada en la UPC."""
    return auth_service.validate_graduate_email(body.email, db)


# ── POST /api/auth/register ──────────────────────────────────────────────────
@router.post("/register", response_model=schemas.RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(request: Request, body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Crea un nuevo usuario. Rol por defecto: COMPANY (role_id=2)."""
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.register_user(body, db, client_ip)


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
        is_active=user.is_active,
        email_verified=user.email_verified,
        privacy_policy_accepted=user.privacy_policy_accepted,
        data_treatment_authorized=user.data_treatment_authorized,
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

# ── PUT /api/auth/users/{user_id} (ADMIN) ────────────────────────────────────
@router.put("/users/{user_id}", response_model=schemas.AccountUpdateResponse)
def admin_update_user(user_id: int, request: Request, body: schemas.AdminUpdateUserRequest,
                      token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """El administrador cambia correo y/o contraseña de cualquier usuario."""
    admin_user = auth_service.get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.admin_update_user(admin_user, user_id, body, db, client_ip)


# ── POST /api/auth/change-password (cualquier usuario autenticado) ───────────
@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(request: Request, body: schemas.ChangePasswordRequest,
                    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Cambia la contraseña del usuario autenticado."""
    user = auth_service.get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.change_password(user, body, db, client_ip)


# ── PUT /api/auth/change-email (EMPRESA) ─────────────────────────────────────
@router.put("/change-email", response_model=schemas.AccountUpdateResponse)
def change_email(request: Request, body: schemas.ChangeEmailRequest,
                 token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Cambia el correo de acceso de una empresa."""
    user = auth_service.get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.change_email(user, body, db, client_ip)


# ── GET /api/auth/system/status (ADMIN) ──────────────────────────────────────
@router.get("/system/status", response_model=schemas.SystemStatusResponse)
def system_status(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Estado en vivo de cada microservicio y de la base de datos."""
    admin_user = auth_service.get_user_from_token(token, db)
    return auth_service.get_system_status(admin_user, db)


# ── GET /api/auth/system/database-info (ADMIN) ───────────────────────────────
@router.get("/system/database-info")
def system_database_info(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Resumen en vivo de las bases de datos PostgreSQL, tablas, relaciones y registros."""
    from app.auth.services import db_dump_service
    admin_user = auth_service.get_user_from_token(token, db)
    return db_dump_service.get_databases_overview(admin_user, db)


# ── GET /api/auth/system/database-dump (ADMIN) ───────────────────────────────
@router.get("/system/database-dump")
def system_database_dump(
    request: Request,
    scope: str = Query("all", description="Base de datos a exportar ('all' o nombre específico)"),
    include_drop: bool = Query(True, description="Incluir sentencias DROP TABLE IF EXISTS"),
    include_data: bool = Query(True, description="Incluir todos los registros (INSERT INTO)"),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Genera y descarga un dump SQL completo de PostgreSQL (tablas, relaciones, secuencias y registros)."""
    from fastapi.responses import Response
    from datetime import datetime, timezone
    from app.auth.services import db_dump_service

    admin_user = auth_service.get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    sql_content, stats = db_dump_service.generate_full_postgres_dump(
        admin_user=admin_user,
        db_session=db,
        scope=scope,
        include_drop=include_drop,
        include_data=include_data,
        client_ip=client_ip,
    )

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    suffix = "full" if scope == "all" else scope
    filename = f"portal_egresados_postgres_dump_{suffix}_{ts}.sql"

    return Response(
        content=sql_content.encode("utf-8"),
        media_type="application/sql; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Dump-Filename": filename,
            "X-Dump-Databases": str(len(stats["databases"])),
            "X-Dump-Tables": str(stats["tables"]),
            "X-Dump-Relations": str(stats["relations"]),
            "X-Dump-Rows": str(stats["rows"]),
            "Access-Control-Expose-Headers": "Content-Disposition, X-Dump-Filename, X-Dump-Databases, X-Dump-Tables, X-Dump-Relations, X-Dump-Rows",
        },
    )


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
from sqlalchemy.sql import func

internal_router = APIRouter(prefix="/api/internal", tags=["Internal"])

@internal_router.post("/users")
def create_user_internal(body: dict, db: Session = Depends(get_db)):
    from app.auth.models import User
    from app.auth.utils.auth_utils import get_password_hash
    
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or "upc12345"
    role_id = body.get("role_id", 3)
    # Al importar egresados desde la BD institucional/Excel, quedan inactivos y sin verificar
    # hasta que el propio egresado se registre y active su cuenta por correo.
    is_active = body.get("is_active", False)
    email_verified = body.get("email_verified", False)
    
    existing_user = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_user:
        if not existing_user.is_active and not existing_user.email_verified and existing_user.role_id == role_id:
            return {
                "id": existing_user.id,
                "email": existing_user.email,
                "role_id": existing_user.role_id,
                "is_active": existing_user.is_active,
                "email_verified": existing_user.email_verified,
            }
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
        
    new_user = User(
        email=email,
        password_hash=get_password_hash(password),
        role_id=role_id,
        is_active=is_active,
        email_verified=email_verified
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role_id": new_user.role_id,
        "is_active": new_user.is_active,
        "email_verified": new_user.email_verified,
    }
