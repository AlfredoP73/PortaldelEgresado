from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.decorators import require_roles
from app.graduates import schemas
from app.graduates.services import graduate_service


router = APIRouter(
    prefix="/api/modulo1",
    tags=["Perfil de Egresado"],
    dependencies=[Depends(get_current_user)]
)

public_router = APIRouter(
    prefix="/api/modulo1",
    tags=["Perfil de Egresado (Público)"]
)

internal_router = APIRouter(
    prefix="/api/internal",
    tags=["Internal APIs"]
)

@internal_router.get("/graduates/{graduate_id}")
def get_graduate_internal(graduate_id: int, db: Session = Depends(get_db)):
    from app.graduates import models
    candidate = db.query(models.Graduate).filter(models.Graduate.user_id == graduate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate_dict = {k: v for k, v in candidate.__dict__.items() if not k.startswith('_')}
    candidate_dict['experiences'] = [{k: v for k, v in exp.__dict__.items() if not k.startswith('_')} for exp in candidate.experiences]
    candidate_dict['academic_histories'] = [{k: v for k, v in edu.__dict__.items() if not k.startswith('_')} for edu in candidate.academic_histories]
    candidate_dict['certifications'] = [{k: v for k, v in cert.__dict__.items() if not k.startswith('_')} for cert in candidate.certifications]
    candidate_dict['skills'] = [
        {
            "skill_id": sk.skill_id,
            "skill_name": sk.skill.name if getattr(sk, 'skill', None) else f"Skill {sk.skill_id}",
            "proficiency_level": sk.proficiency_level
        }
        for sk in getattr(candidate, 'skills', [])
    ]
    candidate_dict['projects'] = [
        {k: v for k, v in proj.__dict__.items() if not k.startswith('_')}
        for proj in getattr(candidate, 'projects', [])
    ]
    
    return candidate_dict

@internal_router.post("/graduates/register-pending")
def upsert_pending_graduate_internal(body: dict, db: Session = Depends(get_db)):
    """Crea o actualiza la ficha del egresado en estado PENDING_VERIFICATION tras el registro abierto."""
    from app.graduates import models

    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es obligatorio")

    ver_status = (body.get("verification_status") or "PENDING_VERIFICATION").upper()
    is_approved = ver_status == "APPROVED"

    prog_id = body.get("program_id") or 1
    prog_exists = db.query(models.Program).filter(models.Program.id == prog_id).first()
    if not prog_exists:
        first_prog = db.query(models.Program).order_by(models.Program.id.asc()).first()
        prog_id = first_prog.id if first_prog else 1

    grad = db.query(models.Graduate).filter(models.Graduate.user_id == user_id).first()
    if grad:
        if body.get("first_name"):
            grad.first_name = body["first_name"]
        if body.get("last_name"):
            grad.last_name = body["last_name"]
        if body.get("document_id") is not None:
            grad.document_id = body.get("document_id")
        if body.get("program_id"):
            grad.program_id = prog_id
        if body.get("graduation_year"):
            grad.graduation_year = int(body["graduation_year"])
        if body.get("degree_act_number") is not None:
            grad.degree_act_number = body.get("degree_act_number")
        if body.get("diploma_number") is not None:
            grad.diploma_number = body.get("diploma_number")
        if body.get("phone") is not None:
            grad.phone = body.get("phone")
        grad.verification_status = ver_status
        grad.verification_notes = None
        grad.directory_visible = is_approved
    else:
        grad = models.Graduate(
            user_id=user_id,
            first_name=body.get("first_name") or "Egresado",
            last_name=body.get("last_name") or "UPC",
            document_id=body.get("document_id"),
            program_id=prog_id,
            graduation_year=int(body.get("graduation_year") or 2024),
            degree_act_number=body.get("degree_act_number"),
            diploma_number=body.get("diploma_number"),
            phone=body.get("phone"),
            verification_status=ver_status,
            verification_notes=None,
            directory_visible=is_approved,
        )
        db.add(grad)

    db.commit()
    db.refresh(grad)
    return {
        "user_id": grad.user_id,
        "verification_status": grad.verification_status,
        "program_id": grad.program_id,
    }


@internal_router.get("/graduates")
def get_all_graduates_internal(include_unverified: bool = False, db: Session = Depends(get_db)):
    from sqlalchemy import or_
    from app.graduates import models
    q = db.query(models.Graduate)
    if not include_unverified:
        q = q.filter(or_(models.Graduate.verification_status == "APPROVED", models.Graduate.verification_status.is_(None)))
    graduates = q.all()
    results = []
    for g in graduates:
        g_dict = {k: v for k, v in g.__dict__.items() if not k.startswith('_')}
        g_dict['experiences'] = [{k: v for k, v in exp.__dict__.items() if not k.startswith('_')} for exp in g.experiences]
        g_dict['academic_histories'] = [{k: v for k, v in edu.__dict__.items() if not k.startswith('_')} for edu in g.academic_histories]
        g_dict['certifications'] = [{k: v for k, v in cert.__dict__.items() if not k.startswith('_')} for cert in g.certifications]
        g_dict['skills'] = [{"skill_id": sk.skill_id, "skill_name": sk.skill.name if hasattr(sk, 'skill') and sk.skill else f"Skill {sk.skill_id}", "proficiency_level": sk.proficiency_level} for sk in g.skills]
        g_dict['projects'] = [{k: v for k, v in proj.__dict__.items() if not k.startswith('_')} for proj in getattr(g, 'projects', [])]
        results.append(g_dict)
    return results

@internal_router.get("/saved-searches")
def get_all_saved_searches_internal(db: Session = Depends(get_db)):
    from app.graduates import models
    searches = db.query(models.SavedSearch).all()
    return [{"id": s.id, "graduate_id": s.graduate_id, "name": s.name, "filters_json": s.filters_json} for s in searches]

@internal_router.get("/matchmaking/graduates")
def get_matchmaking_graduate_ids(db: Session = Depends(get_db)):
    from sqlalchemy import or_
    from app.graduates import models
    ids = db.query(models.Graduate.user_id).filter(
        or_(models.Graduate.verification_status == "APPROVED", models.Graduate.verification_status.is_(None))
    ).all()
    return [r[0] for r in ids]

@internal_router.get("/matchmaking/graduates/{graduate_id}")
def get_matchmaking_graduate(graduate_id: int, db: Session = Depends(get_db)):
    from app.graduates import models
    from datetime import date
    
    g = db.query(models.Graduate).filter(models.Graduate.user_id == graduate_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Not found")
        
    total_exp_days = 0
    for exp in g.experiences:
        start = exp.start_date
        end = exp.end_date or date.today()
        if start:
            total_exp_days += (end - start).days
    total_exp_years = round(total_exp_days / 365.25, 2)
    
    # Needs to return dictionary matching expectations of MatchScoreBuilder
    return {
        "user_id": g.user_id,
        "program_id": g.program_id,
        "job_alerts_enabled": g.job_alerts_enabled if g.job_alerts_enabled is not None else True,
        "alert_min_score": g.alert_min_score if g.alert_min_score is not None else 75,
        "total_experience_years": total_exp_years,
        "experiences": [
            {
                "start_date": exp.start_date.isoformat() if exp.start_date else None,
                "end_date": exp.end_date.isoformat() if exp.end_date else None,
            } for exp in g.experiences
        ],
        "skills": {sk.skill_id: sk.proficiency_level for sk in g.skills}
    }

@router.post("/admin/graduates", response_model=schemas.Graduate)
@require_roles("ADMIN")
def admin_create_graduate(body: schemas.AdminGraduateCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.admin_create_graduate(body, db)

@router.get("/admin/graduates", response_model=List[schemas.Graduate])
@require_roles("ADMIN")
def admin_get_all_graduates(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.admin_get_all_graduates(db)

@router.get("/admin/applications", response_model=List[schemas.Application])
@require_roles("ADMIN")
def admin_get_all_applications(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.admin_get_all_applications(db)

@router.get("/profile", response_model=schemas.Graduate)
def get_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.get_profile(current_user, db)

@router.post("/profile", response_model=schemas.Graduate)
def create_or_update_profile(profile: schemas.GraduateUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.create_or_update_profile(profile, current_user, db)


@router.post("/profile/resubmit-verification", response_model=schemas.Graduate)
def resubmit_verification(
    body: schemas.ResubmitVerificationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return graduate_service.resubmit_verification(body, current_user, db)


@public_router.get("/public/programs", response_model=List[schemas.ProgramPublicOut])
def get_public_programs(db: Session = Depends(get_db)):
    """Catálogo público de programas académicos UPC para el formulario de registro abierto."""
    from app.graduates.models import Program
    return db.query(Program).order_by(Program.id.asc()).all()

@router.post("/cv")
def upload_cv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.upload_cv(file, current_user, db)

@router.post("/cv/parse")
async def parse_cv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.services.cv_parser_service import parse_cv_document
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten documentos en formato PDF")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo permitido (10 MB)")
    return parse_cv_document(content, db)

@router.post("/certifications", response_model=schemas.Certification)
def add_certification(cert: schemas.CertificationCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.add_certification(cert, current_user, db)

@router.delete("/certifications/{cert_id}")
def delete_certification(cert_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.delete_certification(cert_id, current_user, db)

@router.post("/profile/picture")
def upload_profile_picture(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.upload_profile_picture(file, current_user, db)

@public_router.get("/files/{filename}")
def get_file(filename: str):
    try:
        import os
        from app.core.s3 import MinioClient
        s3 = MinioClient.get_client()
        bucket = os.getenv("MINIO_BUCKET_NAME", "cvs")
        response = s3.get_object(Bucket=bucket, Key=filename)
        return StreamingResponse(response['Body'].iter_chunks(), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

@public_router.get("/avatars/{filename}")
def get_avatar(filename: str):
    try:
        import os
        from app.core.s3 import MinioClient
        s3 = MinioClient.get_client()
        bucket = os.getenv("S3_BUCKET_AVATARS", "avatars")
        response = s3.get_object(Bucket=bucket, Key=filename)
        
        content_type = "image/jpeg"
        if filename.lower().endswith('.png'):
            content_type = "image/png"
        elif filename.lower().endswith('.webp'):
            content_type = "image/webp"
            
        return StreamingResponse(response['Body'].iter_chunks(), media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

@public_router.get("/skills", response_model=List[schemas.Skill])
def get_all_skills(db: Session = Depends(get_db)):
    return graduate_service.get_all_skills(db)

@router.post("/skills", response_model=schemas.Skill)
def create_skill(skill: schemas.SkillBase, db: Session = Depends(get_db)):
    return graduate_service.create_skill(skill, db)

@router.put("/profile/skills")
def update_skills(skills_data: schemas.GraduateSkillsUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.update_skills(skills_data, current_user, db)

@router.post("/profile/skills/quick-add")
def quick_add_skill(body: schemas.QuickAddSkillRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return graduate_service.quick_add_skill(body, current_user, db)


# ── BÚSQUEDAS GUARDADAS & ALERTAS ─────────────────────────────────────────────
@router.get("/saved-searches", response_model=List[schemas.SavedSearchResponse])
def get_saved_searches(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import SavedSearch
    return db.query(SavedSearch).filter(SavedSearch.graduate_id == current_user["id"]).order_by(SavedSearch.created_at.desc()).all()

@router.post("/saved-searches", response_model=schemas.SavedSearchResponse)
def create_saved_search(body: schemas.SavedSearchCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import SavedSearch
    new_search = SavedSearch(
        graduate_id=current_user["id"],
        name=body.name,
        filters_json=body.filters_json
    )
    db.add(new_search)
    db.commit()
    db.refresh(new_search)
    return new_search

@router.delete("/saved-searches/{search_id}")
def delete_saved_search(search_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import SavedSearch
    search = db.query(SavedSearch).filter(SavedSearch.id == search_id, SavedSearch.graduate_id == current_user["id"]).first()
    if not search:
        raise HTTPException(status_code=404, detail="Búsqueda no encontrada")
    db.delete(search)
    db.commit()
    return {"message": "Búsqueda eliminada"}

@router.get("/profile/alerts-settings", response_model=schemas.AlertSettingsResponse)
def get_alerts_settings(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import Graduate
    grad = db.query(Graduate).filter(Graduate.user_id == current_user["id"]).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return {
        "job_alerts_enabled": grad.job_alerts_enabled if grad.job_alerts_enabled is not None else True,
        "alert_min_score": grad.alert_min_score if grad.alert_min_score is not None else 75
    }

@router.put("/profile/alerts-settings", response_model=schemas.AlertSettingsResponse)
def update_alerts_settings(body: schemas.AlertSettingsUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import Graduate
    grad = db.query(Graduate).filter(Graduate.user_id == current_user["id"]).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    if body.job_alerts_enabled is not None:
        grad.job_alerts_enabled = body.job_alerts_enabled
    if body.alert_min_score is not None:
        grad.alert_min_score = max(50, min(100, body.alert_min_score))
    db.commit()
    db.refresh(grad)
    return {
        "job_alerts_enabled": grad.job_alerts_enabled,
        "alert_min_score": grad.alert_min_score
    }


# ── DIRECTORIO DE EGRESADOS & MENTORÍA (Fase 5) ──────────────────────────────
@router.get("/directory", response_model=List[schemas.DirectoryGraduateResponse])
def get_alumni_directory(
    program_id: Optional[int] = None,
    graduation_year: Optional[int] = None,
    q: Optional[str] = None,
    mentors_only: bool = False,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        from sqlalchemy import or_
        from app.graduates.models import Graduate, WorkExperience, MentorProfile, Program
        query = db.query(Graduate).filter(
            or_(Graduate.directory_visible == True, Graduate.directory_visible.is_(None)),
            or_(Graduate.verification_status == "APPROVED", Graduate.verification_status.is_(None)),
        )
        if program_id:
            query = query.filter(Graduate.program_id == program_id)
        if graduation_year:
            query = query.filter(Graduate.graduation_year == graduation_year)
        if mentors_only:
            query = query.filter(Graduate.mentor_opt_in == True)
        if q:
            query = query.filter(
                (Graduate.first_name.ilike(f"%{q}%")) |
                (Graduate.last_name.ilike(f"%{q}%")) |
                (Graduate.profile_summary.ilike(f"%{q}%"))
            )
        graduates = query.all()
        try:
            programs_map = {p.id: p.name for p in db.query(Program).all()}
        except Exception:
            programs_map = {}
        
        results = []
        for g in graduates:
            latest_exp = db.query(WorkExperience).filter(WorkExperience.graduate_id == g.user_id).order_by(WorkExperience.start_date.desc()).first()
            mentor_p = db.query(MentorProfile).filter(MentorProfile.graduate_id == g.user_id).first() if g.mentor_opt_in else None
            
            skills_list = []
            if hasattr(g, 'skills') and g.skills:
                for sk in g.skills:
                    if hasattr(sk, 'skill') and sk.skill:
                        skills_list.append(sk.skill.name)
            
            results.append(schemas.DirectoryGraduateResponse(
                user_id=g.user_id,
                first_name=g.first_name,
                last_name=g.last_name,
                program_id=g.program_id,
                program_name=programs_map.get(g.program_id, f"Programa #{g.program_id}"),
                graduation_year=g.graduation_year,
                profile_summary=g.profile_summary,
                profile_picture_url=g.profile_picture_url,
                current_company=latest_exp.company_name if latest_exp else None,
                current_position=latest_exp.position if latest_exp else None,
                mentor_opt_in=bool(g.mentor_opt_in),
                mentor_profile=mentor_p,
                skills=skills_list
            ))
        return results
    except Exception as e:
        print(f"Safe fallback in get_alumni_directory: {e}")
        return []

@router.get("/mentor-profile", response_model=Optional[schemas.MentorProfileResponse])
def get_mentor_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import MentorProfile
    return db.query(MentorProfile).filter(MentorProfile.graduate_id == current_user["id"]).first()

@router.post("/mentor-profile", response_model=schemas.MentorProfileResponse)
def create_or_update_mentor_profile(body: schemas.MentorProfileCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import MentorProfile, Graduate
    grad = db.query(Graduate).filter(Graduate.user_id == current_user["id"]).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    grad.mentor_opt_in = True
    
    p = db.query(MentorProfile).filter(MentorProfile.graduate_id == current_user["id"]).first()
    if p:
        p.headline = body.headline
        p.bio = body.bio
        p.areas_json = body.areas_json
        p.max_mentees = body.max_mentees or 3
        p.is_active = body.is_active if body.is_active is not None else True
    else:
        p = MentorProfile(
            graduate_id=current_user["id"],
            headline=body.headline,
            bio=body.bio,
            areas_json=body.areas_json,
            max_mentees=body.max_mentees or 3,
            is_active=True
        )
        db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.post("/mentorships/request", response_model=schemas.MentorshipRequestResponse)
def request_mentorship(body: schemas.MentorshipRequestCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    graduate_service.ensure_graduate_verified(current_user, db)
    from app.graduates.models import MentorshipRequest, Graduate
    from app.core.adapters import HttpAuthAdapter
    auth_adapter = HttpAuthAdapter()
    
    if body.mentor_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="No puedes solicitarte mentoría a ti mismo")
    
    existing = db.query(MentorshipRequest).filter(
        MentorshipRequest.mentee_id == current_user["id"],
        MentorshipRequest.mentor_id == body.mentor_id,
        MentorshipRequest.status == "PENDING"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya tienes una solicitud pendiente con este mentor")
        
    req = MentorshipRequest(
        mentee_id=current_user["id"],
        mentor_id=body.mentor_id,
        message=body.message,
        goal=body.goal,
        status="PENDING"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    
    try:
        mentee = db.query(Graduate).filter(Graduate.user_id == current_user["id"]).first()
        mentee_name = f"{mentee.first_name} {mentee.last_name}" if mentee else "Un egresado"
        auth_adapter.send_notification(
            user_id=body.mentor_id,
            title="Nueva solicitud de mentoría",
            message=f"{mentee_name} te ha enviado una solicitud de mentoría.",
            type="MENTORSHIP",
            payload={"request_id": req.id, "mentee_id": current_user["id"]},
            dedup_key=f"mentorship_req_{req.id}"
        )
    except Exception as e:
        print(f"Error notifying mentor: {e}")

    return req

@router.get("/mentorships", response_model=List[schemas.MentorshipRequestResponse])
def get_mentorships(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.graduates.models import MentorshipRequest, Graduate
    reqs = db.query(MentorshipRequest).filter(
        (MentorshipRequest.mentee_id == current_user["id"]) |
        (MentorshipRequest.mentor_id == current_user["id"])
    ).order_by(MentorshipRequest.created_at.desc()).all()
    
    user_ids = set()
    for r in reqs:
        user_ids.add(r.mentee_id)
        user_ids.add(r.mentor_id)
    
    grads = {g.user_id: f"{g.first_name} {g.last_name}" for g in db.query(Graduate).filter(Graduate.user_id.in_(user_ids)).all()} if user_ids else {}
    
    results = []
    for r in reqs:
        r_dict = {
            "id": r.id,
            "mentee_id": r.mentee_id,
            "mentor_id": r.mentor_id,
            "message": r.message,
            "goal": r.goal,
            "status": r.status,
            "conversation_id": r.conversation_id,
            "created_at": r.created_at,
            "mentee_name": grads.get(r.mentee_id, f"Usuario #{r.mentee_id}"),
            "mentor_name": grads.get(r.mentor_id, f"Usuario #{r.mentor_id}")
        }
        results.append(schemas.MentorshipRequestResponse(**r_dict))
    return results

@router.put("/mentorships/{request_id}/status")
def update_mentorship_status(
    request_id: int,
    body: schemas.MentorshipRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import MentorshipRequest, Graduate
    from app.core.adapters import HttpAuthAdapter
    auth_adapter = HttpAuthAdapter()
    
    req = db.query(MentorshipRequest).filter(
        MentorshipRequest.id == request_id,
        MentorshipRequest.mentor_id == current_user["id"]
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada o no tienes permiso")
        
    req.status = body.status
    conversation_id = None
    
    if body.status == "ACCEPTED":
        try:
            conv = auth_adapter.create_conversation(
                context_type="MENTORSHIP",
                context_id=req.id,
                participant_ids=[req.mentor_id, req.mentee_id]
            )
            if conv and "id" in conv:
                req.conversation_id = conv["id"]
                conversation_id = conv["id"]
        except Exception as e:
            print(f"Error creating conversation: {e}")
            
    db.commit()
    
    try:
        mentor = db.query(Graduate).filter(Graduate.user_id == current_user["id"]).first()
        mentor_name = f"{mentor.first_name} {mentor.last_name}" if mentor else "Tu mentor"
        status_text = "aceptada" if body.status == "ACCEPTED" else "rechazada" if body.status == "REJECTED" else "finalizada"
        auth_adapter.send_notification(
            user_id=req.mentee_id,
            title=f"Solicitud de mentoría {status_text}",
            message=f"{mentor_name} ha {status_text} tu solicitud de mentoría.",
            type="MENTORSHIP",
            payload={"request_id": req.id, "conversation_id": conversation_id, "status": body.status},
            dedup_key=f"mentorship_status_{req.id}_{body.status}"
        )
    except Exception as e:
        print(f"Error notifying mentee: {e}")
        
    return {"status": "ok", "mentorship_status": req.status, "conversation_id": req.conversation_id}




# ── PERFIL PÚBLICO DE EGRESADO & PORTAFOLIO DE PROYECTOS ───────────────────────
@router.get("/graduates/{target_user_id}/public-profile", response_model=schemas.GraduatePublicProfileResponse)
def get_graduate_public_profile(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import (
        Graduate, WorkExperience, AcademicHistory, Certification,
        GraduateProject, GraduateConnection, Program
    )
    g = db.query(Graduate).filter(Graduate.user_id == target_user_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado")

    try:
        prog = db.query(Program).filter(Program.id == g.program_id).first()
        prog_name = prog.name if prog else f"Programa #{g.program_id}"
    except Exception:
        prog_name = f"Programa #{g.program_id}"

    experiences = db.query(WorkExperience).filter(WorkExperience.graduate_id == target_user_id).order_by(WorkExperience.start_date.desc()).all()
    academics = db.query(AcademicHistory).filter(AcademicHistory.graduate_id == target_user_id).order_by(AcademicHistory.start_date.desc()).all()
    certs = db.query(Certification).filter(Certification.graduate_id == target_user_id).order_by(Certification.issue_date.desc()).all()
    projects = db.query(GraduateProject).filter(GraduateProject.graduate_id == target_user_id).order_by(GraduateProject.created_at.desc()).all()

    skills_list = []
    if hasattr(g, 'skills') and g.skills:
        for sk in g.skills:
            if hasattr(sk, 'skill') and sk.skill:
                skills_list.append(sk.skill.name)

    my_id = current_user.get("id")
    conn_status = "NONE"
    conn_id = None
    if my_id == target_user_id:
        conn_status = "SELF"
    else:
        conn = db.query(GraduateConnection).filter(
            ((GraduateConnection.requester_id == my_id) & (GraduateConnection.addressee_id == target_user_id)) |
            ((GraduateConnection.requester_id == target_user_id) & (GraduateConnection.addressee_id == my_id))
        ).first()
        if conn:
            conn_status = conn.status
            conn_id = conn.id

    return schemas.GraduatePublicProfileResponse(
        user_id=g.user_id,
        first_name=g.first_name,
        last_name=g.last_name,
        program_id=g.program_id,
        program_name=prog_name,
        graduation_year=g.graduation_year,
        phone=g.phone,
        profile_summary=g.profile_summary,
        profile_picture_url=g.profile_picture_url,
        cv_url=g.cv_url,
        availability_status=g.availability_status,
        preferred_modality=g.preferred_modality,
        experiences=experiences,
        academic_histories=academics,
        certifications=certs,
        skills=skills_list,
        projects=projects,
        connection_status=conn_status,
        connection_id=conn_id
    )


# ── CRUD DE PROYECTOS Y PORTAFOLIO ─────────────────────────────────────────────
@router.get("/projects", response_model=List[schemas.ProjectResponse])
def get_my_projects(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateProject
    return db.query(GraduateProject).filter(
        GraduateProject.graduate_id == current_user["id"]
    ).order_by(GraduateProject.created_at.desc()).all()


@router.get("/graduates/{target_user_id}/projects", response_model=List[schemas.ProjectResponse])
def get_graduate_projects(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateProject
    return db.query(GraduateProject).filter(
        GraduateProject.graduate_id == target_user_id
    ).order_by(GraduateProject.created_at.desc()).all()


@router.post("/projects", response_model=schemas.ProjectResponse)
def create_project(
    body: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateProject
    proj = GraduateProject(
        graduate_id=current_user["id"],
        title=body.title,
        description=body.description,
        project_url=body.project_url,
        repository_url=body.repository_url,
        image_url=body.image_url,
        technologies=body.technologies
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@router.put("/projects/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    body: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateProject
    proj = db.query(GraduateProject).filter(
        GraduateProject.id == project_id,
        GraduateProject.graduate_id == current_user["id"]
    ).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if body.title is not None: proj.title = body.title
    if body.description is not None: proj.description = body.description
    if body.project_url is not None: proj.project_url = body.project_url
    if body.repository_url is not None: proj.repository_url = body.repository_url
    if body.image_url is not None: proj.image_url = body.image_url
    if body.technologies is not None: proj.technologies = body.technologies

    db.commit()
    db.refresh(proj)
    return proj


@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateProject
    proj = db.query(GraduateProject).filter(
        GraduateProject.id == project_id,
        GraduateProject.graduate_id == current_user["id"]
    ).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    db.delete(proj)
    db.commit()
    return {"status": "ok", "message": "Proyecto eliminado exitosamente"}


# ── SOLICITUDES DE CONEXIÓN Y AMISTAD ENTRE EGRESADOS ──────────────────────────
@router.post("/connections/request", response_model=schemas.ConnectionStatusResponse)
def send_connection_request(
    body: schemas.ConnectionRequestCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    graduate_service.ensure_graduate_verified(current_user, db)
    from app.graduates.models import GraduateConnection, Graduate
    my_id = current_user["id"]
    target_id = body.target_user_id

    # Solo egresados pueden enviar solicitudes de conexion entre egresados
    my_role = current_user.get("role", current_user.get("role_name", "")).upper()
    requester_is_grad = db.query(Graduate).filter(Graduate.user_id == my_id).first()
    if not requester_is_grad:
        raise HTTPException(status_code=400, detail="Solo los egresados pueden enviar solicitudes de conexion. Las empresas contactan egresados desde el modulo de candidatos.")

    if my_id == target_id:
        raise HTTPException(status_code=400, detail="No puedes enviarte una solicitud de conexión a ti mismo")

    target = db.query(Graduate).filter(Graduate.user_id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="El egresado destinatario no existe")

    existing = db.query(GraduateConnection).filter(
        ((GraduateConnection.requester_id == my_id) & (GraduateConnection.addressee_id == target_id)) |
        ((GraduateConnection.requester_id == target_id) & (GraduateConnection.addressee_id == my_id))
    ).first()

    if existing:
        if existing.status == "ACCEPTED":
            return schemas.ConnectionStatusResponse(status="ACCEPTED", is_requester=(existing.requester_id == my_id), connection_id=existing.id)
        elif existing.status == "PENDING":
            return schemas.ConnectionStatusResponse(status="PENDING", is_requester=(existing.requester_id == my_id), connection_id=existing.id)
        else:
            # Reintentar si fue rechazada
            existing.status = "PENDING"
            existing.requester_id = my_id
            existing.addressee_id = target_id
            existing.message = body.message
            db.commit()
            return schemas.ConnectionStatusResponse(status="PENDING", is_requester=True, connection_id=existing.id)

    conn = GraduateConnection(
        requester_id=my_id,
        addressee_id=target_id,
        status="PENDING",
        message=body.message
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    # Notificar al destinatario mediante auth_adapter
    try:
        sender_grad = db.query(Graduate).filter(Graduate.user_id == my_id).first()
        sender_name = f"{sender_grad.first_name} {sender_grad.last_name}" if sender_grad else "Un egresado"
        auth_adapter.send_notification(
            user_id=target_id,
            title="Nueva solicitud de conexión",
            message=f"{sender_name} quiere conectar contigo en la Red de Egresados.",
            type="CONNECTION",
            payload={"connection_id": conn.id, "sender_id": my_id},
            dedup_key=f"conn_req_{conn.id}"
        )
    except Exception as e:
        print(f"Notice: failed to send connection push: {e}")

    return schemas.ConnectionStatusResponse(status="PENDING", is_requester=True, connection_id=conn.id)


@router.get("/network/suggestions")
def get_network_suggestions(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Retorna egresados similares al perfil del usuario actual (excluye al propio usuario y ya-conectados)."""
    from app.graduates.models import Graduate, GraduateSkill, Skill, GraduateConnection
    from sqlalchemy import or_

    my_id = current_user["id"]

    # Obtener perfil propio
    me = db.query(Graduate).filter(Graduate.user_id == my_id).first()

    # Obtener IDs de ya-conectados
    connected_ids = set()
    conns = db.query(GraduateConnection).filter(
        or_(
            GraduateConnection.requester_id == my_id,
            GraduateConnection.addressee_id == my_id
        )
    ).all()
    for c in conns:
        connected_ids.add(c.requester_id)
        connected_ids.add(c.addressee_id)
    connected_ids.discard(my_id)

    # Obtener mis skills
    my_skill_ids = set()
    if me:
        my_skills = db.query(GraduateSkill).filter(GraduateSkill.graduate_id == me.user_id).all()
        my_skill_ids = {s.skill_id for s in my_skills}

    # Query: egresados visibles y aprobados, excluyendo yo y ya-conectados
    candidates = db.query(Graduate).filter(
        Graduate.user_id != my_id,
        or_(Graduate.directory_visible == True, Graduate.directory_visible.is_(None)),
        or_(Graduate.verification_status == "APPROVED", Graduate.verification_status.is_(None)),
    ).limit(100).all()

    suggestions = []
    for grad in candidates:
        if grad.user_id in connected_ids:
            continue

        # Score de afinidad simple
        score = 0
        if me and grad.program_id and me.program_id and grad.program_id == me.program_id:
            score += 40
        their_skills = db.query(GraduateSkill).filter(GraduateSkill.graduate_id == grad.user_id).all()
        their_skill_ids = {s.skill_id for s in their_skills}
        common = len(my_skill_ids & their_skill_ids)
        score += min(common * 10, 40)
        if grad.profile_picture_url:
            score += 10
        if grad.profile_summary:
            score += 5

        # Obtener nombres de skills
        skill_names = []
        for sk in their_skills[:5]:
            skill = db.query(Skill).filter(Skill.id == sk.skill_id).first()
            if skill:
                skill_names.append(skill.name)

        # Connection status
        conn_status = "NONE"
        for c in conns:
            if c.requester_id == grad.user_id or c.addressee_id == grad.user_id:
                conn_status = c.status
                break

        suggestions.append({
            "user_id": grad.user_id,
            "full_name": f"{grad.first_name} {grad.last_name}".strip() or "Egresado",
            "profile_picture_url": grad.profile_picture_url,
            "headline": grad.profile_summary,
            "skills": skill_names,
            "affinity_score": score,
            "connection_status": conn_status,
            "graduation_year": grad.graduation_year,
        })

    suggestions.sort(key=lambda x: x["affinity_score"], reverse=True)
    return suggestions[:20]

@router.get("/connections")
def get_connections(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateConnection, Graduate, Program
    my_id = current_user["id"]

    try:
        programs_map = {p.id: p.name for p in db.query(Program).all()}
    except Exception:
        programs_map = {}

    all_conns = db.query(GraduateConnection).filter(
        (GraduateConnection.requester_id == my_id) | (GraduateConnection.addressee_id == my_id)
    ).all()

    incoming = []
    sent = []
    accepted = []

    for c in all_conns:
        is_req = (c.requester_id == my_id)
        peer_id = c.addressee_id if is_req else c.requester_id
        peer = db.query(Graduate).filter(Graduate.user_id == peer_id).first()
        peer_name = f"{peer.first_name} {peer.last_name}" if peer else f"Egresado #{peer_id}"
        peer_prog = programs_map.get(peer.program_id, f"Programa #{peer.program_id}") if peer else ""
        peer_pic = peer.profile_picture_url if peer else None

        item = {
            "id": c.id,
            "requester_id": c.requester_id,
            "addressee_id": c.addressee_id,
            "status": c.status,
            "message": c.message,
            "created_at": c.created_at,
            "peer_id": peer_id,
            "peer_name": peer_name,
            "peer_program": peer_prog,
            "peer_picture_url": peer_pic,
            "is_requester": is_req
        }

        if c.status == "ACCEPTED":
            accepted.append(item)
        elif c.status == "PENDING":
            if is_req:
                sent.append(item)
            else:
                incoming.append(item)

    return {
        "incoming": incoming,
        "sent": sent,
        "accepted": accepted
    }


@router.put("/connections/{connection_id}/respond")
def respond_connection(
    connection_id: int,
    body: schemas.ConnectionAction,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateConnection, Graduate
    my_id = current_user["id"]
    conn = db.query(GraduateConnection).filter(
        GraduateConnection.id == connection_id,
        GraduateConnection.addressee_id == my_id
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Solicitud de conexión no encontrada o no tienes permiso para responderla")

    action = body.action.upper()
    if action not in ["ACCEPT", "REJECT"]:
        raise HTTPException(status_code=400, detail="Acción inválida. Usa ACCEPT o REJECT")

    conn.status = "ACCEPTED" if action == "ACCEPT" else "REJECTED"
    db.commit()

    if action == "ACCEPT":
        # Iniciar conversación en auth_db
        try:
            auth_adapter.create_conversation(
                context_type="NETWORKING",
                context_id=conn.id,
                participant_ids=[conn.requester_id, conn.addressee_id]
            )
        except Exception as e:
            print(f"Error creating networking conversation: {e}")

        # Notificar al solicitante
        try:
            my_grad = db.query(Graduate).filter(Graduate.user_id == my_id).first()
            my_name = f"{my_grad.first_name} {my_grad.last_name}" if my_grad else "Un egresado"
            auth_adapter.send_notification(
                user_id=conn.requester_id,
                title="¡Solicitud de conexión aceptada!",
                message=f"{my_name} aceptó tu solicitud. Ahora pueden comunicarse por Mensajes Directos.",
                type="CONNECTION",
                payload={"connection_id": conn.id, "peer_id": my_id},
                dedup_key=f"conn_acc_{conn.id}"
            )
        except Exception as e:
            print(f"Error notifying requester: {e}")

    return {"status": "ok", "connection_status": conn.status}


@router.get("/connections/status/{target_user_id}", response_model=schemas.ConnectionStatusResponse)
def get_connection_status(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    from app.graduates.models import GraduateConnection
    my_id = current_user["id"]
    if my_id == target_user_id:
        return schemas.ConnectionStatusResponse(status="SELF", is_requester=False)

    conn = db.query(GraduateConnection).filter(
        ((GraduateConnection.requester_id == my_id) & (GraduateConnection.addressee_id == target_user_id)) |
        ((GraduateConnection.requester_id == target_user_id) & (GraduateConnection.addressee_id == my_id))
    ).first()

    if not conn:
        return schemas.ConnectionStatusResponse(status="NONE", is_requester=False)

    return schemas.ConnectionStatusResponse(
        status=conn.status,
        is_requester=(conn.requester_id == my_id),
        connection_id=conn.id
    )


# ── PANEL DE VERIFICACIÓN DE EGRESADOS (ROL COORDINATOR / ADMIN) ─────────────
@router.get("/coordinator/verifications")
@require_roles("COORDINATOR", "ADMIN")
def list_coordinator_verifications(
    status: Optional[str] = None,
    program_id: Optional[int] = None,
    graduation_year: Optional[int] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    from app.graduates.models import Graduate, Program
    from app.core.adapters import HttpAuthAdapter

    programs_map = {p.id: p.name for p in db.query(Program).all()}
    users_map = HttpAuthAdapter().get_users_map()

    all_grads = db.query(Graduate).order_by(Graduate.user_id.desc()).all()

    summary = {
        "pending": 0,
        "approved": 0,
        "rejected": 0,
        "total": len(all_grads),
    }

    items = []
    search_clean = (q or "").strip().lower()
    status_filter = (status or "ALL").strip().upper()

    for g in all_grads:
        v_status = (getattr(g, "verification_status", None) or "APPROVED").upper()
        if v_status == "PENDING_VERIFICATION":
            summary["pending"] += 1
        elif v_status == "REJECTED":
            summary["rejected"] += 1
        else:
            summary["approved"] += 1

        if status_filter not in ("ALL", "") and v_status != status_filter:
            continue
        if program_id and g.program_id != program_id:
            continue
        if graduation_year and g.graduation_year != graduation_year:
            continue

        u_info = users_map.get(str(g.user_id), {})
        email = u_info.get("email") or f"usuario_{g.user_id}@portal"
        full_name = f"{g.first_name or ''} {g.last_name or ''}".strip()
        doc_id = getattr(g, "document_id", None) or ""
        act_num = getattr(g, "degree_act_number", None) or ""
        dip_num = getattr(g, "diploma_number", None) or ""
        prog_name = programs_map.get(g.program_id, f"Programa #{g.program_id}")

        if search_clean:
            haystack = f"{full_name} {email} {doc_id} {act_num} {dip_num} {prog_name}".lower()
            if search_clean not in haystack:
                continue

        items.append({
            "user_id": g.user_id,
            "email": email,
            "email_verified": bool(u_info.get("email_verified", False)),
            "is_active": bool(u_info.get("is_active", False)),
            "created_at": u_info.get("created_at"),
            "first_name": g.first_name,
            "last_name": g.last_name,
            "document_id": getattr(g, "document_id", None),
            "program_id": g.program_id,
            "program_name": prog_name,
            "graduation_year": g.graduation_year,
            "degree_act_number": getattr(g, "degree_act_number", None),
            "diploma_number": getattr(g, "diploma_number", None),
            "phone": g.phone,
            "cv_url": g.cv_url,
            "verification_status": v_status,
            "verification_notes": getattr(g, "verification_notes", None),
            "verified_by_user_id": getattr(g, "verified_by_user_id", None),
            "verified_at": g.verified_at.isoformat() if getattr(g, "verified_at", None) else None,
        })

    # Ordenar priorizando PENDING_VERIFICATION primero, luego REJECTED, luego APPROVED
    priority = {"PENDING_VERIFICATION": 0, "REJECTED": 1, "APPROVED": 2}
    items.sort(key=lambda x: (priority.get(x["verification_status"], 3), -x["user_id"]))

    return {
        "summary": summary,
        "programs": [{"id": pid, "name": pname} for pid, pname in sorted(programs_map.items())],
        "items": items,
    }


@router.post("/coordinator/verifications/{target_user_id}/approve")
@require_roles("COORDINATOR", "ADMIN")
def approve_graduate_verification(
    target_user_id: int,
    body: schemas.CoordinatorVerificationDecisionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    from app.graduates.models import Graduate
    from app.core.adapters import HttpAuthAdapter, get_matchmaking_adapter

    grad = db.query(Graduate).filter(Graduate.user_id == target_user_id).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Ficha de egresado no encontrada")

    grad.verification_status = "APPROVED"
    grad.verification_notes = (body.notes or "").strip() or None
    grad.directory_visible = True
    grad.verified_by_user_id = current_user["id"]
    grad.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(grad)

    full_name = f"{grad.first_name or ''} {grad.last_name or ''}".strip()
    HttpAuthAdapter().update_user_verification(
        user_id=target_user_id,
        verification_status="APPROVED",
        verification_notes=grad.verification_notes,
        full_name=full_name,
    )

    try:
        get_matchmaking_adapter().trigger_recalculate(graduate_id=target_user_id)
    except Exception as e:
        print(f"Notice: matchmaking trigger after coordinator approve failed: {e}")

    return {
        "message": f"Egresado {full_name} aprobado exitosamente.",
        "user_id": grad.user_id,
        "verification_status": grad.verification_status,
    }


@router.post("/coordinator/verifications/{target_user_id}/reject")
@require_roles("COORDINATOR", "ADMIN")
def reject_graduate_verification(
    target_user_id: int,
    body: schemas.CoordinatorVerificationDecisionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    from app.graduates.models import Graduate
    from app.core.adapters import HttpAuthAdapter

    notes = (body.notes or "").strip()
    if not notes:
        raise HTTPException(
            status_code=400,
            detail="Debes especificar el motivo u observación para que el egresado pueda corregir sus datos.",
        )

    grad = db.query(Graduate).filter(Graduate.user_id == target_user_id).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Ficha de egresado no encontrada")

    grad.verification_status = "REJECTED"
    grad.verification_notes = notes
    grad.directory_visible = False
    grad.verified_by_user_id = current_user["id"]
    grad.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(grad)

    full_name = f"{grad.first_name or ''} {grad.last_name or ''}".strip()
    HttpAuthAdapter().update_user_verification(
        user_id=target_user_id,
        verification_status="REJECTED",
        verification_notes=notes,
        full_name=full_name,
    )

    return {
        "message": f"Solicitud de {full_name} marcada con observación.",
        "user_id": grad.user_id,
        "verification_status": grad.verification_status,
        "verification_notes": grad.verification_notes,
    }
