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

def ensure_graduate_verified(current_user: dict, db: Session) -> Optional[models.Graduate]:
    """
    Bloquea funciones sensibles para egresados cuya cuenta aún se encuentra en
    estado PENDING_VERIFICATION o REJECTED ante la Coordinación UPC.
    """
    if not current_user or current_user.get("role_id") != 3:
        return None
    grad = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    status_val = (getattr(grad, "verification_status", None) if grad else current_user.get("verification_status")) or "APPROVED"
    if status_val != "APPROVED":
        if status_val == "REJECTED":
            notes = getattr(grad, "verification_notes", None) if grad else None
            msg = (
                f"Tu verificación académica presenta una observación de Coordinación UPC: "
                f"{notes or 'Revisa tu cédula y número de acta/diploma en tu perfil y reenvía la solicitud.'}"
            )
        else:
            msg = (
                "Tu cuenta se encuentra PENDIENTE DE VERIFICACIÓN por el Coordinador UPC. "
                "Una vez validada tu cédula y acta/diploma se habilitarán postulaciones, encuestas oficiales, networking y mensajería."
            )
        raise HTTPException(status_code=403, detail=msg)
    return grad


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
        
    # Remove fields not editable directly / not in DB
    profile_data.pop("address", None)
    profile_data.pop("document_type", None)
    profile_data.pop("user_id", None)
    profile_data.pop("verification_status", None)
    profile_data.pop("verification_notes", None)
    profile_data.pop("verified_by_user_id", None)
    profile_data.pop("verified_at", None)

    if db_profile:
        # Si aún no está aprobado, mantener oculto del directorio público
        if (getattr(db_profile, "verification_status", None) or "APPROVED") != "APPROVED":
            profile_data["directory_visible"] = False
        for key, value in profile_data.items():
            if hasattr(db_profile, key):
                setattr(db_profile, key, value)
    else:
        # Require mandatory fields for new profile
        if not all(k in profile_data for k in ("first_name", "last_name", "program_id", "graduation_year")):
            raise HTTPException(status_code=400, detail="Faltan campos obligatorios para crear el perfil")
        init_status = current_user.get("verification_status") or "APPROVED"
        if init_status != "APPROVED":
            profile_data["directory_visible"] = False
        db_profile = models.Graduate(
            **profile_data,
            user_id=current_user["id"],
            verification_status=init_status,
        )
        db.add(db_profile)
    
    db.commit()
    db.refresh(db_profile)
    if (getattr(db_profile, "verification_status", None) or "APPROVED") == "APPROVED":
        matchmaking_adapter.trigger_recalculate(graduate_id=current_user["id"])
    return db_profile


def resubmit_verification(body: schemas.ResubmitVerificationRequest, current_user: dict, db: Session):
    """Permite al egresado corregir cédula, programa, año y acta/diploma y volver a PENDING_VERIFICATION."""
    grad = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado")

    doc_id = (body.document_id or "").strip()
    act_num = (body.degree_act_number or "").strip()
    dip_num = (body.diploma_number or "").strip()
    if not doc_id:
        raise HTTPException(status_code=400, detail="El número de cédula es obligatorio.")
    if not act_num and not dip_num:
        raise HTTPException(status_code=400, detail="Debes indicar tu número de acta de grado o número de diploma.")

    if body.first_name and body.first_name.strip():
        grad.first_name = body.first_name.strip()
    if body.last_name and body.last_name.strip():
        grad.last_name = body.last_name.strip()
    grad.document_id = doc_id
    grad.program_id = body.program_id
    grad.graduation_year = body.graduation_year
    grad.degree_act_number = act_num or None
    grad.diploma_number = dip_num or None
    if body.phone is not None:
        grad.phone = body.phone.strip() or None
    grad.verification_status = "PENDING_VERIFICATION"
    grad.verification_notes = None
    grad.directory_visible = False

    db.commit()
    db.refresh(grad)

    auth_adapter.update_user_verification(
        user_id=grad.user_id,
        verification_status="PENDING_VERIFICATION",
        verification_notes=None,
        full_name=f"{grad.first_name} {grad.last_name}",
    )
    return grad

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

