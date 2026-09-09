from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

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
        from app.core.s3 import MinioClient
        s3 = MinioClient.get_client()
        response = s3.get_object(Bucket="cvs", Key=filename)
        return StreamingResponse(response['Body'].iter_chunks(), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

@public_router.get("/avatars/{filename}")
def get_avatar(filename: str):
    try:
        from app.core.s3 import MinioClient
        s3 = MinioClient.get_client()
        response = s3.get_object(Bucket="avatars", Key=filename)
        
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
