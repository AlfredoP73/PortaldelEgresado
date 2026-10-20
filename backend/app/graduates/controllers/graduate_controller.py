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
    
    return candidate_dict

@internal_router.get("/graduates")
def get_all_graduates_internal(db: Session = Depends(get_db)):
    from app.graduates import models
    graduates = db.query(models.Graduate).all()
    results = []
    for g in graduates:
        g_dict = {k: v for k, v in g.__dict__.items() if not k.startswith('_')}
        g_dict['experiences'] = [{k: v for k, v in exp.__dict__.items() if not k.startswith('_')} for exp in g.experiences]
        g_dict['academic_histories'] = [{k: v for k, v in edu.__dict__.items() if not k.startswith('_')} for edu in g.academic_histories]
        g_dict['certifications'] = [{k: v for k, v in cert.__dict__.items() if not k.startswith('_')} for cert in g.certifications]
        g_dict['skills'] = [{"skill_id": sk.skill_id, "skill_name": sk.skill.name if hasattr(sk, 'skill') and sk.skill else f"Skill {sk.skill_id}", "proficiency_level": sk.proficiency_level} for sk in g.skills]
        results.append(g_dict)
    return results

@internal_router.get("/saved-searches")
def get_all_saved_searches_internal(db: Session = Depends(get_db)):
    from app.graduates import models
    searches = db.query(models.SavedSearch).all()
    return [{"id": s.id, "graduate_id": s.graduate_id, "name": s.name, "filters_json": s.filters_json} for s in searches]

@internal_router.get("/matchmaking/graduates")
def get_matchmaking_graduate_ids(db: Session = Depends(get_db)):
    from app.graduates import models
    ids = db.query(models.Graduate.user_id).all()
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
    from app.graduates.models import Graduate, WorkExperience, MentorProfile, Program
    query = db.query(Graduate).filter(Graduate.directory_visible == True)
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
    programs_map = {p.id: p.name for p in db.query(Program).all()}
    
    results = []
    for g in graduates:
        latest_exp = db.query(WorkExperience).filter(WorkExperience.graduate_id == g.user_id).order_by(WorkExperience.start_date.desc()).first()
        mentor_p = db.query(MentorProfile).filter(MentorProfile.graduate_id == g.user_id).first() if g.mentor_opt_in else None
        
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
            skills=[sk.skill.name for sk in g.skills if hasattr(sk, 'skill') and sk.skill] if hasattr(g, 'skills') else []
        ))
    return results

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


