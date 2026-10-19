from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, UploadFile
from typing import Optional
import uuid
import os
import shutil
from app.graduates import models, schemas
from app.auth.models import User
from app.auth.utils.auth_utils import get_password_hash
from app.core.adapters import HttpCompaniesAdapter, HttpAuthAdapter

companies_adapter = HttpCompaniesAdapter()
auth_adapter = HttpAuthAdapter()

def admin_get_all_applications(db: Session):
    try:
        return companies_adapter.get_all_applications()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Companies: {str(e)}")

def admin_create_graduate(body: schemas.AdminGraduateCreate, db: Session):
    # Call auth microservice to create user (inactivo hasta que el egresado active por correo)
    try:
        new_user = auth_adapter.create_user({
            "email": body.email.strip().lower(),
            "password": body.password,
            "role_id": 3,
            "is_active": False,
            "email_verified": False,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Auth: {str(e)}")

    existing_grad = db.query(models.Graduate).filter(models.Graduate.user_id == new_user["id"]).first()
    if existing_grad:
        existing_grad.first_name = body.first_name
        existing_grad.last_name = body.last_name
        existing_grad.program_id = body.program_id
        existing_grad.graduation_year = body.graduation_year
        if body.phone:
            existing_grad.phone = body.phone
        db.commit()
        db.refresh(existing_grad)
        return existing_grad

    new_grad = models.Graduate(
        user_id=new_user["id"],
        first_name=body.first_name,
        last_name=body.last_name,
        program_id=body.program_id,
        graduation_year=body.graduation_year,
        phone=body.phone
    )
    db.add(new_grad)
    db.commit()
    db.refresh(new_grad)
    return new_grad

def admin_get_all_graduates(db: Session):
    return db.query(models.Graduate).all()

def get_profile(current_user: dict, db: Session):
    profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return profile

def create_or_update_profile(profile: schemas.GraduateUpdate, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    
    # Map fields that the mobile app sends with different names
    profile_data = profile.model_dump(exclude_unset=True)
    
    if "bio" in profile_data:
        profile_data["profile_summary"] = profile_data.pop("bio")
    if "phone_number" in profile_data:
        profile_data["phone"] = profile_data.pop("phone_number")
        
    # Remove fields not in DB to prevent errors
    profile_data.pop("document_id", None)
    profile_data.pop("address", None)
    profile_data.pop("document_type", None)
    profile_data.pop("user_id", None)

    if db_profile:
        for key, value in profile_data.items():
            if hasattr(db_profile, key):
                setattr(db_profile, key, value)
    else:
        # Require mandatory fields for new profile
        if not all(k in profile_data for k in ("first_name", "last_name", "program_id", "graduation_year")):
            raise HTTPException(status_code=400, detail="Faltan campos obligatorios para crear el perfil")
        db_profile = models.Graduate(**profile_data, user_id=current_user["id"])
        db.add(db_profile)
    
    db.commit()
    db.refresh(db_profile)
    matchmaking_adapter.trigger_recalculate(graduate_id=current_user["id"])
    return db_profile

from app.core.adapters import MinioStorageAdapter, RabbitMQMatchmakingAdapter

MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "cvs")
storage_adapter = MinioStorageAdapter()
matchmaking_adapter = RabbitMQMatchmakingAdapter()

def upload_cv(file: UploadFile, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Debes completar tu perfil antes de subir tu CV")
        
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser PDF")

    try:
        filename = storage_adapter.upload_file(file, MINIO_BUCKET_NAME, "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo a MinIO: {str(e)}")
        
    db_profile.cv_url = f"/api/modulo1/files/{filename}"
    db.commit()
    return {"message": "CV subido exitosamente", "cv_url": db_profile.cv_url}

def upload_profile_picture(file: UploadFile, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Debes completar tu perfil antes de subir tu foto")
        
    allowed_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen (JPG, PNG, WEBP)")
        
    bucket_name = os.getenv("S3_BUCKET_AVATARS", "avatars")

    # Set content type based on extension
    content_type = "image/jpeg"
    if file.filename.lower().endswith('.png'):
        content_type = "image/png"
    elif file.filename.lower().endswith('.webp'):
        content_type = "image/webp"

    try:
        filename = storage_adapter.upload_file(file, bucket_name, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir la imagen a MinIO: {str(e)}")
        
    db_profile.profile_picture_url = f"/api/modulo1/avatars/{filename}"
    db.commit()
    return {"message": "Foto de perfil subida exitosamente", "profile_picture_url": db_profile.profile_picture_url}

def add_certification(cert: schemas.CertificationCreate, current_user: dict, db: Session):
    db_cert = models.Certification(**cert.model_dump(), graduate_id=current_user["id"])
    db.add(db_cert)
    db.commit()
    db.refresh(db_cert)
    return db_cert

def delete_certification(cert_id: int, current_user: dict, db: Session):
    db_cert = db.query(models.Certification).filter(models.Certification.id == cert_id, models.Certification.graduate_id == current_user["id"]).first()
    if not db_cert:
        raise HTTPException(status_code=404, detail="Certificación no encontrada")
    db.delete(db_cert)
    db.commit()
    return {"detail": "Eliminada"}

def get_all_skills(db: Session):
    return db.query(models.Skill).all()

def create_skill(skill: schemas.SkillBase, db: Session):
    existing = db.query(models.Skill).filter(models.Skill.name.ilike(skill.name.strip())).first()
    if existing:
        return existing
    db_skill = models.Skill(name=skill.name.strip())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

def update_skills(skills_data: schemas.GraduateSkillsUpdate, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=400, detail="Debe guardar sus datos básicos antes de añadir habilidades")

    db.query(models.GraduateSkill).filter(models.GraduateSkill.graduate_id == current_user["id"]).delete()
    
    for skill in skills_data.skills:
        db_skill = models.GraduateSkill(
            graduate_id=current_user["id"],
            skill_id=skill.skill_id,
            proficiency_level=skill.proficiency_level
        )
        db.add(db_skill)
    
    db.commit()
    matchmaking_adapter.trigger_recalculate(graduate_id=current_user["id"])
    return {"detail": "Habilidades actualizadas"}

def quick_add_skill(body: schemas.QuickAddSkillRequest, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=400, detail="Completa primero tus datos básicos del perfil")

    skill_id = body.skill_id
    skill_obj = None
    if skill_id:
        skill_obj = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill_obj and body.skill_name:
        skill_obj = db.query(models.Skill).filter(models.Skill.name.ilike(body.skill_name.strip())).first()
        if not skill_obj:
            skill_obj = models.Skill(name=body.skill_name.strip())
            db.add(skill_obj)
            db.commit()
            db.refresh(skill_obj)
        skill_id = skill_obj.id

    if not skill_id:
        raise HTTPException(status_code=400, detail="Debe indicar skill_id o skill_name")

    existing = db.query(models.GraduateSkill).filter(
        models.GraduateSkill.graduate_id == current_user["id"],
        models.GraduateSkill.skill_id == skill_id
    ).first()
    if not existing:
        db.add(models.GraduateSkill(
            graduate_id=current_user["id"],
            skill_id=skill_id,
            proficiency_level=body.proficiency_level or "Intermedio"
        ))
        db.commit()
        matchmaking_adapter.trigger_recalculate(graduate_id=current_user["id"])

    return {
        "detail": "Habilidad agregada a tu perfil y afinidad recalculada",
        "skill_id": skill_id,
        "skill_name": skill_obj.name if skill_obj else (body.skill_name or f"Skill #{skill_id}"),
    }

