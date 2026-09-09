from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
import uuid
import os
import shutil
from app.graduates import models, schemas
from app.core.adapters import MinioStorageAdapter
import os

MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "cvs")

def add_experience(experience: schemas.WorkExperienceCreate, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=400, detail="Debe guardar sus datos básicos antes de añadir experiencia")

    db_exp = models.WorkExperience(**experience.model_dump(), graduate_id=current_user["id"])
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    return db_exp

def delete_experience(exp_id: int, current_user: dict, db: Session):
    db_exp = db.query(models.WorkExperience).filter(models.WorkExperience.id == exp_id, models.WorkExperience.graduate_id == current_user["id"]).first()
    if not db_exp:
        raise HTTPException(status_code=404, detail="Experiencia no encontrada")
    db.delete(db_exp)
    db.commit()
    return {"detail": "Eliminada"}

def upload_experience_certificate(exp_id: int, file: UploadFile, current_user: dict, db: Session):
    db_exp = db.query(models.WorkExperience).filter(models.WorkExperience.id == exp_id, models.WorkExperience.graduate_id == current_user["id"]).first()
    if not db_exp:
        raise HTTPException(status_code=404, detail="Experiencia no encontrada")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser PDF")
        
    adapter = MinioStorageAdapter()
    
    try:
        filename = adapter.upload_file(file, MINIO_BUCKET_NAME, "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el certificado a MinIO: {str(e)}")
        
    db_exp.certificate_url = f"/api/modulo1/files/{filename}"
    db.commit()
    return {"message": "Certificado subido exitosamente", "certificate_url": db_exp.certificate_url}
