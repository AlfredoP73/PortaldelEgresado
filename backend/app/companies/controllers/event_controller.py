from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.decorators import require_roles
from app.companies import models, schemas
from app.core.adapters import HttpAuthAdapter

router = APIRouter(
    prefix="/api/modulo2",
    tags=["Eventos y Ferias"]
)

auth_adapter = HttpAuthAdapter()


@router.get("/events", response_model=List[schemas.EventResponse])
def get_events(
    modality: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Lista eventos disponibles con filtros por modalidad y texto."""
    try:
        query = db.query(models.Event)

        # Si no es ADMIN ni la empresa organizadora, solo ver PUBLISHED
        is_admin = current_user and current_user.get("role_id") == 1
        if not is_admin:
            if status:
                query = query.filter(models.Event.status == status)
            else:
                query = query.filter(models.Event.status.in_(["PUBLISHED", "FINISHED"]))
        elif status:
            query = query.filter(models.Event.status == status)

        if modality and modality.upper() != "TODAS":
            query = query.filter(models.Event.modality.ilike(f"%{modality}%"))

        if q:
            query = query.filter(
                (models.Event.title.ilike(f"%{q}%")) |
                (models.Event.description.ilike(f"%{q}%")) |
                (models.Event.organizer_name.ilike(f"%{q}%"))
            )

        events = query.order_by(models.Event.starts_at.asc()).all()

        user_id = current_user["id"] if current_user else None

        results = []
        for ev in events:
            reg_count = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == ev.id).count()
            is_reg = False
            if user_id:
                is_reg = db.query(models.EventRegistration).filter(
                    models.EventRegistration.event_id == ev.id,
                    models.EventRegistration.graduate_id == user_id
                ).first() is not None

            resp = schemas.EventResponse(
                id=ev.id,
                organizer_user_id=ev.organizer_user_id,
                organizer_role=ev.organizer_role,
                organizer_name=ev.organizer_name,
                title=ev.title,
                description=ev.description,
                modality=ev.modality,
                location_or_url=ev.location_or_url,
                starts_at=ev.starts_at,
                ends_at=ev.ends_at,
                capacity=ev.capacity,
                status=ev.status,
                created_at=ev.created_at,
                registered_count=reg_count,
                is_registered=is_reg
            )
            results.append(resp)

        return results
    except Exception as e:
        print(f"Safe fallback in get_events: {e}")
        return []


@router.get("/events/my-events", response_model=List[schemas.EventResponse])
def get_my_events(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Eventos creados por la empresa autenticada."""
    events = db.query(models.Event).filter(models.Event.organizer_user_id == current_user["id"]).order_by(models.Event.starts_at.desc()).all()
    results = []
    for ev in events:
        reg_count = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == ev.id).count()
        results.append(schemas.EventResponse(
            id=ev.id,
            organizer_user_id=ev.organizer_user_id,
            organizer_role=ev.organizer_role,
            organizer_name=ev.organizer_name,
            title=ev.title,
            description=ev.description,
            modality=ev.modality,
            location_or_url=ev.location_or_url,
            starts_at=ev.starts_at,
            ends_at=ev.ends_at,
            capacity=ev.capacity,
            status=ev.status,
            created_at=ev.created_at,
            registered_count=reg_count,
            is_registered=False
        ))
    return results


@router.get("/events/{event_id}", response_model=schemas.EventResponse)
def get_event_detail(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    reg_count = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == ev.id).count()
    is_reg = False
    if current_user:
        is_reg = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == ev.id,
            models.EventRegistration.graduate_id == current_user["id"]
        ).first() is not None

    return schemas.EventResponse(
        id=ev.id,
        organizer_user_id=ev.organizer_user_id,
        organizer_role=ev.organizer_role,
        organizer_name=ev.organizer_name,
        title=ev.title,
        description=ev.description,
        modality=ev.modality,
        location_or_url=ev.location_or_url,
        starts_at=ev.starts_at,
        ends_at=ev.ends_at,
        capacity=ev.capacity,
        status=ev.status,
        created_at=ev.created_at,
        registered_count=reg_count,
        is_registered=is_reg
    )


@router.post("/events", response_model=schemas.EventResponse)
def create_event(
    body: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un evento.
    - Empresas: solo si están en status APPROVED.
    - Admins: eventos institucionales con organizador Universidad Popular del Cesar.
    """
    role_id = current_user.get("role_id")
    organizer_role = "COMPANY"
    organizer_name = "Empresa Aliada"

    if role_id == 1: # ADMIN
        organizer_role = "ADMIN"
        organizer_name = "Universidad Popular del Cesar"
    elif role_id == 2: # COMPANY
        company = db.query(models.Company).filter(models.Company.user_id == current_user["id"]).first()
        if not company:
            raise HTTPException(status_code=404, detail="Perfil de empresa no encontrado")
        if company.status != models.CompanyStatus.APPROVED:
            raise HTTPException(status_code=403, detail="Tu empresa debe estar aprobada por la administración para publicar eventos")
        organizer_name = company.name
    else:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear eventos")

    new_event = models.Event(
        organizer_user_id=current_user["id"],
        organizer_role=organizer_role,
        organizer_name=organizer_name,
        title=body.title,
        description=body.description,
        modality=body.modality or "VIRTUAL",
        location_or_url=body.location_or_url,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        capacity=body.capacity,
        status="PUBLISHED"
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return schemas.EventResponse(
        id=new_event.id,
        organizer_user_id=new_event.organizer_user_id,
        organizer_role=new_event.organizer_role,
        organizer_name=new_event.organizer_name,
        title=new_event.title,
        description=new_event.description,
        modality=new_event.modality,
        location_or_url=new_event.location_or_url,
        starts_at=new_event.starts_at,
        ends_at=new_event.ends_at,
        capacity=new_event.capacity,
        status=new_event.status,
        created_at=new_event.created_at,
        registered_count=0,
        is_registered=False
    )


@router.put("/events/{event_id}", response_model=schemas.EventResponse)
def update_event(
    event_id: int,
    body: schemas.EventUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    is_admin = current_user.get("role_id") == 1
    is_owner = ev.organizer_user_id == current_user["id"]
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este evento")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if hasattr(ev, k):
            setattr(ev, k, v)

    db.commit()
    db.refresh(ev)

    reg_count = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == ev.id).count()
    return schemas.EventResponse(
        id=ev.id,
        organizer_user_id=ev.organizer_user_id,
        organizer_role=ev.organizer_role,
        organizer_name=ev.organizer_name,
        title=ev.title,
        description=ev.description,
        modality=ev.modality,
        location_or_url=ev.location_or_url,
        starts_at=ev.starts_at,
        ends_at=ev.ends_at,
        capacity=ev.capacity,
        status=ev.status,
        created_at=ev.created_at,
        registered_count=reg_count,
        is_registered=False
    )


@router.post("/events/{event_id}/register")
def register_to_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Inscripción de un egresado a un evento con verificación transaccional de cupo."""
    ev = db.query(models.Event).filter(models.Event.id == event_id).with_for_update().first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    if ev.status != "PUBLISHED":
        raise HTTPException(status_code=400, detail="El evento no se encuentra activo")

    # Verificar si ya está registrado
    existing = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.graduate_id == current_user["id"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya te encuentras inscrito en este evento")

    # Control de cupo estricto
    if ev.capacity is not None and ev.capacity > 0:
        current_count = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == event_id).count()
        if current_count >= ev.capacity:
            raise HTTPException(status_code=400, detail="El evento ha alcanzado su cupo máximo de participantes")

    reg = models.EventRegistration(
        event_id=event_id,
        graduate_id=current_user["id"],
        graduate_name=current_user.get("email", "").split("@")[0],
        graduate_email=current_user.get("email")
    )
    db.add(reg)
    db.commit()

    # Disparar notificación push/in-app de confirmación
    try:
        auth_adapter.send_notification(
            user_id=current_user["id"],
            title="Inscripción confirmada al evento",
            message=f"Te has inscrito exitosamente en '{ev.title}'. Fecha: {ev.starts_at.strftime('%d/%m/%Y %H:%M')}",
            type="EVENT",
            payload={"event_id": ev.id, "starts_at": ev.starts_at.isoformat()},
            dedup_key=f"event_reg_{event_id}_{current_user['id']}"
        )
    except Exception as e:
        print(f"Error notifying event registration: {e}")

    return {"status": "ok", "message": "Inscripción exitosa", "event_id": event_id}


@router.delete("/events/{event_id}/register")
def cancel_event_registration(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.graduate_id == current_user["id"]
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="No estás inscrito en este evento")

    db.delete(reg)
    db.commit()
    return {"status": "ok", "message": "Inscripción cancelada"}


@router.get("/events/{event_id}/registrations", response_model=List[schemas.EventRegistrationResponse])
def get_event_registrations(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista los inscritos (solo para la empresa organizadora o admin)."""
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    is_admin = current_user.get("role_id") == 1
    if not is_admin and ev.organizer_user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver los inscritos de este evento")

    return db.query(models.EventRegistration).filter(models.EventRegistration.event_id == event_id).order_by(models.EventRegistration.registered_at.desc()).all()


@router.get("/events/{event_id}/registrations/csv")
def export_event_registrations_csv(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Exporta los inscritos en formato CSV."""
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    is_admin = current_user.get("role_id") == 1
    if not is_admin and ev.organizer_user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para exportar inscritos")

    regs = db.query(models.EventRegistration).filter(models.EventRegistration.event_id == event_id).order_by(models.EventRegistration.registered_at.desc()).all()

    csv_lines = ["ID,Egresado,Correo,Fecha Inscripcion"]
    for r in regs:
        reg_date = r.registered_at.strftime("%Y-%m-%d %H:%M:%S") if r.registered_at else ""
        csv_lines.append(f"{r.graduate_id},\"{r.graduate_name or ''}\",\"{r.graduate_email or ''}\",{reg_date}")

    csv_data = "\n".join(csv_lines)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inscritos_evento_{event_id}.csv"}
    )


@router.get("/events/{event_id}/ics")
def export_event_ics(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Genera archivo de calendario estándar .ics (iCalendar) compatible con Outlook y Google Calendar."""
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    dt_start = ev.starts_at.strftime("%Y%m%dT%H%M%SZ")
    dt_end = ev.ends_at.strftime("%Y%m%dT%H%M%SZ")
    dt_now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    desc_escaped = (ev.description or "").replace("\r\n", "\\n").replace("\n", "\\n")

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Universidad Popular del Cesar//Portal Egresados//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:event-{ev.id}@portaldelregresado.unicesar.edu.co
DTSTAMP:{dt_now}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:{ev.title}
DESCRIPTION:{desc_escaped}
LOCATION:{ev.location_or_url or 'Virtual'}
ORGANIZER;CN="{ev.organizer_name}":MAILTO:noreply@unicesar.edu.co
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=evento_{event_id}.ics"}
    )

