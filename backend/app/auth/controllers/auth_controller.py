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


# ── POST /api/auth/admin/users (Solo ADMIN) ──────────────────────────────────
@router.post("/admin/users", response_model=schemas.UserInfo, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    request: Request,
    body: schemas.AdminCreateUserRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Permite a un ADMIN crear cuentas activas (ADMIN, COMPANY, GRADUATE, COORDINATOR)."""
    admin_user = auth_service.get_user_from_token(token, db)
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.admin_create_user(admin_user, body, db, client_ip)


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
    return auth_service._build_user_info(user)

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
def get_my_notifications(
    unread_only: bool = False,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Devuelve las notificaciones del usuario autenticado (con filtro opcional unread_only)."""
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(Notification.created_at.desc()).limit(50).all()

@router.get("/notifications/unread-count")
def get_unread_count(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Contador de alertas pendientes para la campana del Navbar."""
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    count = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == False).count()
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    from datetime import datetime, timezone
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Notificación marcada como leída"}

@router.put("/notifications/read-all")
def mark_all_notifications_read(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Notification
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": now})
    db.commit()
    return {"message": "Todas las notificaciones marcadas como leídas"}

# ── DISPOSITIVOS PUSH (FCM) ───────────────────────────────────────────────────
@router.post("/devices")
def register_device_token(
    body: schemas.DeviceTokenRegisterRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Registra o actualiza el token FCM de un dispositivo móvil para recibir alertas push."""
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import DeviceToken
    from datetime import datetime, timezone
    tok = (body.token or "").strip()
    if not tok:
        raise HTTPException(status_code=400, detail="Token no válido")
    
    existing = db.query(DeviceToken).filter(DeviceToken.token == tok).first()
    if existing:
        existing.user_id = user.id
        existing.platform = body.platform or "android"
        existing.last_seen_at = datetime.now(timezone.utc)
    else:
        new_dev = DeviceToken(
            user_id=user.id,
            token=tok,
            platform=body.platform or "android"
        )
        db.add(new_dev)
    db.commit()
    return {"status": "ok", "message": "Dispositivo registrado para alertas push"}

@router.delete("/devices/{device_token}")
def unregister_device_token(
    device_token: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Elimina el token FCM al cerrar sesión para no recibir notificaciones de otro usuario."""
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import DeviceToken
    db.query(DeviceToken).filter(DeviceToken.token == device_token, DeviceToken.user_id == user.id).delete()
    db.commit()
    return {"status": "ok", "message": "Dispositivo desvinculado"}


# ── MENSAJERÍA DIRECTA (Fase 4) ───────────────────────────────────────────────
@router.get("/conversations", response_model=List[schemas.ConversationResponse])
def get_user_conversations(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        user = auth_service.get_user_from_token(token, db)
        from app.auth.models import Conversation, ConversationParticipant, Message, User
        
        participations = db.query(ConversationParticipant).filter(ConversationParticipant.user_id == user.id).all()
        conv_ids = [p.conversation_id for p in participations]
        if not conv_ids:
            return []
            
        conversations = db.query(Conversation).filter(Conversation.id.in_(conv_ids)).order_by(Conversation.created_at.desc()).all()
        last_reads = {p.conversation_id: p.last_read_at for p in participations}
        
        results = []
        for c in conversations:
            all_parts = [cp.user_id for cp in db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == c.id).all()]
            last_msg = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at.desc()).first()
            last_msg_resp = None
            if last_msg:
                sender = db.query(User).filter(User.id == last_msg.sender_id).first()
                last_msg_resp = schemas.MessageResponse(
                    id=last_msg.id,
                    conversation_id=last_msg.conversation_id,
                    sender_id=last_msg.sender_id,
                    sender_email=sender.email if sender else f"user_{last_msg.sender_id}",
                    body=last_msg.body,
                    created_at=last_msg.created_at
                )
                
            lr = last_reads.get(c.id)
            msg_query = db.query(Message).filter(Message.conversation_id == c.id, Message.sender_id != user.id)
            if lr:
                unread_count = msg_query.filter(Message.created_at > lr).count()
            else:
                unread_count = msg_query.count()
                
            # Nombres y correos de los otros participantes
            other_pids = [pid for pid in all_parts if pid != user.id]
            other_users = db.query(User).filter(User.id.in_(other_pids)).all() if other_pids else []
            part_emails = [u.email for u in other_users]
            part_names = []
            for u in other_users:
                name = None
                try:
                    from app.graduates.models import Graduate
                    grad = db.query(Graduate).filter(Graduate.user_id == u.id).first()
                    if grad and (grad.first_name or grad.last_name):
                        name = f"{grad.first_name or ''} {grad.last_name or ''}".strip()
                except Exception:
                    pass
                if not name:
                    try:
                        from app.companies.models import Company
                        comp = db.query(Company).filter(Company.user_id == u.id).first()
                        if comp and comp.company_name:
                            name = comp.company_name
                    except Exception:
                        pass
                if not name:
                    name = u.email.split('@')[0] if u.email else f"Usuario #{u.id}"
                part_names.append(name)
                
            conv_title = ", ".join(part_names) if part_names else ("Tu espacio personal" if all_parts == [user.id] else "Conversación")

            results.append(schemas.ConversationResponse(
                id=c.id,
                context_type=c.context_type,
                context_id=c.context_id,
                created_at=c.created_at,
                participants=all_parts,
                unread_count=unread_count,
                last_message=last_msg_resp,
                title=conv_title,
                participant_names=part_names,
                participant_emails=part_emails
            ))
            
        return results
    except Exception as e:
        print(f"Safe fallback in get_user_conversations: {e}")
        return []

@router.get("/conversations/{conversation_id}")
def get_conversation_detail(
    conversation_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Conversation, ConversationParticipant, Message, User
    from datetime import datetime, timezone
    
    part = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user.id
    ).first()
    if not part:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta conversación")
        
    part.last_read_at = datetime.now(timezone.utc)
    db.commit()
    
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
        
    msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    senders = {u.id: u.email for u in db.query(User).filter(User.id.in_([m.sender_id for m in msgs])).all()}
    
    messages_resp = [
        {
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "sender_email": senders.get(m.sender_id, f"user_{m.sender_id}"),
            "body": m.body,
            "created_at": m.created_at
        } for m in msgs
    ]
    
    other_parts = [cp.user_id for cp in db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id != user.id).all()]
    other_users = db.query(User).filter(User.id.in_(other_parts)).all() if other_parts else []
    part_names = []
    for u in other_users:
        name = None
        try:
            from app.graduates.models import Graduate
            grad = db.query(Graduate).filter(Graduate.user_id == u.id).first()
            if grad and (grad.first_name or grad.last_name):
                name = f"{grad.first_name or ''} {grad.last_name or ''}".strip()
        except Exception:
            pass
        if not name:
            try:
                from app.companies.models import Company
                comp = db.query(Company).filter(Company.user_id == u.id).first()
                if comp and comp.company_name:
                    name = comp.company_name
            except Exception:
                pass
        if not name:
            name = u.email.split('@')[0] if u.email else f"Usuario #{u.id}"
        part_names.append(name)
    conv_title = ", ".join(part_names) if part_names else "Conversación"

    return {
        "id": conv.id,
        "title": conv_title,
        "context_type": conv.context_type,
        "context_id": conv.context_id,
        "created_at": conv.created_at,
        "messages": messages_resp
    }

@router.post("/conversations/{conversation_id}/messages", response_model=schemas.MessageResponse)
def send_conversation_message(
    conversation_id: int,
    body: schemas.MessageCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = auth_service.get_user_from_token(token, db)
    from app.auth.models import Conversation, ConversationParticipant, Message, User, DeviceToken, Notification
    from app.auth.services.push_service import send_multicast_push
    from datetime import datetime, timezone
    
    part = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user.id
    ).first()
    if not part:
        raise HTTPException(status_code=403, detail="No participas en esta conversación")
        
    part.last_read_at = datetime.now(timezone.utc)
    
    msg_body = (body.body or "").strip()
    if not msg_body:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")
        
    new_msg = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        body=msg_body
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    other_parts = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != user.id
    ).all()
    
    for op in other_parts:
        db_notif = Notification(
            user_id=op.user_id,
            title="Nuevo mensaje",
            message=f"{user.email.split('@')[0]}: {msg_body[:80]}",
            type="MESSAGE",
            payload={"conversation_id": conversation_id, "message_id": new_msg.id},
            is_read=False
        )
        db.add(db_notif)
        
        tokens = [t.token for t in db.query(DeviceToken).filter(DeviceToken.user_id == op.user_id).all()]
        if tokens:
            send_multicast_push(
                tokens=tokens,
                title="Nuevo mensaje",
                body=f"{user.email.split('@')[0]}: {msg_body[:80]}",
                data={"type": "MESSAGE", "conversation_id": str(conversation_id)}
            )
            
    db.commit()
    return schemas.MessageResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_id=new_msg.sender_id,
        sender_email=user.email,
        body=new_msg.body,
        created_at=new_msg.created_at
    )

@router.post("/conversations", response_model=schemas.ConversationResponse)
def create_or_get_conversation(
    body: schemas.ConversationCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = auth_service.get_user_from_token(token, db)
    if user.role_id == 3 and (getattr(user, "verification_status", None) or "APPROVED") != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta de egresado está pendiente de verificación por el Coordinador UPC. Una vez aprobada tu acta/diploma podrás iniciar conversaciones directas.",
        )
    from app.auth.models import Conversation, ConversationParticipant
    
    if body.context_id:
        existing = db.query(Conversation).filter(
            Conversation.context_type == body.context_type,
            Conversation.context_id == body.context_id
        ).first()
        if existing:
            parts = [cp.user_id for cp in db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == existing.id).all()]
            return schemas.ConversationResponse(
                id=existing.id,
                context_type=existing.context_type,
                context_id=existing.context_id,
                created_at=existing.created_at,
                participants=parts
            )

    # Si es directo o de networking sin context_id, buscar si ya existe entre los mismos participantes
    target_pids = set(body.participant_ids)
    target_pids.add(user.id)
    if body.context_type in ["DIRECT", "NETWORKING"] and not body.context_id:
        user_cids = [r[0] for r in db.query(ConversationParticipant.conversation_id).filter(ConversationParticipant.user_id == user.id).all()]
        for cid in user_cids:
            c_parts = set([r[0] for r in db.query(ConversationParticipant.user_id).filter(ConversationParticipant.conversation_id == cid).all()])
            if c_parts == target_pids:
                existing = db.query(Conversation).filter(Conversation.id == cid).first()
                if existing:
                    return schemas.ConversationResponse(
                        id=existing.id,
                        context_type=existing.context_type,
                        context_id=existing.context_id,
                        created_at=existing.created_at,
                        participants=list(target_pids)
                    )
            
    new_conv = Conversation(
        context_type=body.context_type,
        context_id=body.context_id
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    
    all_participants = set(body.participant_ids)
    all_participants.add(user.id)
    
    for pid in all_participants:
        db.add(ConversationParticipant(conversation_id=new_conv.id, user_id=pid))
    db.commit()
    
    return schemas.ConversationResponse(
        id=new_conv.id,
        context_type=new_conv.context_type,
        context_id=new_conv.context_id,
        created_at=new_conv.created_at,
        participants=list(all_participants)
    )


from fastapi import APIRouter, HTTPException
from sqlalchemy.sql import func

internal_router = APIRouter(prefix="/api/internal", tags=["Internal"])

@internal_router.post("/notifications")
def create_internal_notification(
    body: schemas.CreateInternalNotificationRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint interno utilizado por matchmaking/companies/graduates para generar
    alertas inteligentes. Incluye deduplicación y envío de push móvil automático.
    """
    from app.auth.models import Notification, DeviceToken
    from app.auth.services.push_service import send_multicast_push

    # Deduplicación: Si ya existe una alerta con ese dedup_key para este usuario, no duplicar
    if body.dedup_key:
        exists = db.query(Notification).filter(
            Notification.user_id == body.user_id,
            Notification.dedup_key == body.dedup_key
        ).first()
        if exists:
            return {"status": "duplicate", "notification_id": exists.id}

    notif = Notification(
        user_id=body.user_id,
        title=body.title,
        message=body.message,
        type=body.type or "system",
        payload=body.payload,
        dedup_key=body.dedup_key,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Disparar Push móvil si el usuario tiene dispositivos registrados
    tokens = [t.token for t in db.query(DeviceToken).filter(DeviceToken.user_id == body.user_id).all()]
    if tokens:
        push_data = {"type": body.type or "system"}
        if body.payload and isinstance(body.payload, dict):
            for k, v in body.payload.items():
                push_data[str(k)] = str(v)
        send_multicast_push(tokens=tokens, title=body.title, body=body.message, data=push_data)

    return {"status": "created", "notification_id": notif.id}

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

@internal_router.post("/conversations")
def create_internal_conversation(body: schemas.ConversationCreate, db: Session = Depends(get_db)):
    from app.auth.models import Conversation, ConversationParticipant
    if body.context_id:
        existing = db.query(Conversation).filter(
            Conversation.context_type == body.context_type,
            Conversation.context_id == body.context_id
        ).first()
        if existing:
            return {"id": existing.id, "status": "existing"}
            
    new_conv = Conversation(
        context_type=body.context_type,
        context_id=body.context_id
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    for pid in body.participant_ids:
        db.add(ConversationParticipant(conversation_id=new_conv.id, user_id=pid))
    db.commit()
    return {"id": new_conv.id, "status": "created"}


@internal_router.get("/users/map")
def get_users_map_internal(db: Session = Depends(get_db)):
    """Mapa ligero de usuarios para enriquecer paneles internos (ej. Coordinador de Verificación)."""
    from app.auth.models import User
    users = db.query(User).all()
    return {
        str(u.id): {
            "id": u.id,
            "email": u.email,
            "role_id": u.role_id,
            "is_active": u.is_active,
            "email_verified": u.email_verified,
            "verification_status": getattr(u, "verification_status", None) or "APPROVED",
            "verification_notes": getattr(u, "verification_notes", None),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    }


@internal_router.put("/users/{user_id}/verification")
def update_user_verification_internal(
    user_id: int,
    body: schemas.InternalUserVerificationUpdate,
    db: Session = Depends(get_db),
):
    """Sincroniza el estado de verificación (PENDING_VERIFICATION / APPROVED / REJECTED) y notifica al egresado."""
    from app.auth.models import User, Notification, DeviceToken
    from app.auth.services.push_service import send_multicast_push
    from app.auth.services.email_service import send_graduate_verification_decision_email

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en Auth")

    new_status = (body.verification_status or "PENDING_VERIFICATION").upper()
    if new_status not in ("PENDING_VERIFICATION", "APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Estado de verificación inválido")

    user.verification_status = new_status
    user.verification_notes = body.verification_notes
    db.commit()

    full_name = (body.full_name or "").strip()
    if new_status in ("APPROVED", "REJECTED"):
        approved = new_status == "APPROVED"
        notif_title = (
            "¡Tu cuenta de Egresado UPC fue aprobada!"
            if approved
            else "Observación en la verificación de tu título"
        )
        notif_msg = (
            "La Coordinación UPC validó tu acta/diploma. Ya tienes acceso completo a vacantes, encuestas, red y mensajería."
            if approved
            else f"El Coordinador registró una observación: {body.verification_notes or 'Revisa tu cédula y acta/diploma y vuelve a enviar.'}"
        )
        notif = Notification(
            user_id=user.id,
            title=notif_title,
            message=notif_msg,
            type="VERIFICATION_DECISION",
            payload={"verification_status": new_status, "notes": body.verification_notes},
            is_read=False,
        )
        db.add(notif)
        db.commit()

        tokens = [t.token for t in db.query(DeviceToken).filter(DeviceToken.user_id == user.id).all()]
        if tokens:
            send_multicast_push(
                tokens=tokens,
                title=notif_title,
                body=notif_msg,
                data={"type": "VERIFICATION_DECISION", "status": new_status},
            )

        send_graduate_verification_decision_email(
            to_email=user.email,
            full_name=full_name,
            approved=approved,
            notes=body.verification_notes,
        )
    elif new_status == "PENDING_VERIFICATION":
        auth_service._notify_coordinators_of_pending_graduate(
            db=db,
            graduate_user_id=user.id,
            full_name=full_name or user.email,
            email=user.email,
            document_id=None,
            act_or_diploma="Reenvío de corrección",
        )

    return {
        "status": "updated",
        "user_id": user.id,
        "verification_status": user.verification_status,
        "verification_notes": user.verification_notes,
    }
