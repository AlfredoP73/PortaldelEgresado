from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
import uuid
import os
import shutil
from app.graduates import models, schemas
from app.core.adapters import MinioStorageAdapter
import os

MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "cvs")

def add_academic_history(history: schemas.AcademicHistoryCreate, current_user: dict, db: Session):
    db_profile = db.query(models.Graduate).filter(models.Graduate.user_id == current_user["id"]).first()
    if not db_profile:
        raise HTTPException(status_code=400, detail="Debe guardar sus datos básicos antes de añadir formación académica")

    db_hist = models.AcademicHistory(**history.model_dump(), graduate_id=current_user["id"])
    db.add(db_hist)
    db.commit()
    db.refresh(db_hist)
    return db_hist

def delete_academic_history(hist_id: int, current_user: dict, db: Session):
    db_hist = db.query(models.AcademicHistory).filter(models.AcademicHistory.id == hist_id, models.AcademicHistory.graduate_id == current_user["id"]).first()
    if not db_hist:
        raise HTTPException(status_code=404, detail="Historial no encontrado")
    db.delete(db_hist)
    db.commit()
    return {"detail": "Eliminado"}

def upload_education_diploma(edu_id: int, file: UploadFile, current_user: dict, db: Session):
    db_edu = db.query(models.AcademicHistory).filter(models.AcademicHistory.id == edu_id, models.AcademicHistory.graduate_id == current_user["id"]).first()
    if not db_edu:
        raise HTTPException(status_code=404, detail="Historial académico no encontrado")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser PDF")
        
    adapter = MinioStorageAdapter()
    
    try:
        filename = adapter.upload_file(file, MINIO_BUCKET_NAME, "application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el diploma a MinIO: {str(e)}")
        
    db_edu.diploma_url = f"/api/modulo1/files/{filename}"
    db.commit()
    return {"message": "Diploma subido exitosamente", "diploma_url": db_edu.diploma_url}
