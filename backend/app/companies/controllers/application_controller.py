from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.rbac import RoleChecker
from app.companies import schemas
from app.companies.services import application_service

require_company = RoleChecker(["COMPANY"])
require_admin_or_company = RoleChecker(["ADMIN", "COMPANY"])

router = APIRouter(
    prefix="/api/modulo2",
    tags=["Postulaciones y Talent Pool"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/applications", response_model=schemas.Application) 
def create_application(app: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    return application_service.create_application(app, db)

@router.get("/applications/job/{job_offer_id}", response_model=List[schemas.ApplicationWithCandidate], dependencies=[Depends(require_admin_or_company)])
def get_applications_by_job(job_offer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.get_applications_by_job(job_offer_id, current_user, db)

@router.put("/applications/{application_id}/status", response_model=schemas.Application, dependencies=[Depends(require_company)])
def update_application_status(application_id: int, status_update: schemas.ApplicationUpdateStatus, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.update_application_status(application_id, status_update, current_user, db)

@router.post("/applications/bulk-update", response_model=List[schemas.Application], dependencies=[Depends(require_company)])
def bulk_update_application_status(update_data: schemas.BulkApplicationUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.bulk_update_application_status(update_data, current_user, db)

@router.get("/applications/{application_id}/candidate", response_model=schemas.GraduateWithContact, dependencies=[Depends(require_admin_or_company)])
def get_application_candidate(application_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.get_application_candidate(application_id, current_user, db)

@router.get("/talent-pool", response_model=List[schemas.GraduateWithContact], dependencies=[Depends(require_admin_or_company)])
def get_talent_pool(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.get_talent_pool(db)

@router.post("/jobs/{job_id}/stages/{stage}/sub-processes", response_model=dict, dependencies=[Depends(require_company)])
def create_global_sub_process(job_id: int, stage: str, sub_process: schemas.SubProcessBase, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.create_global_sub_process(job_id, stage, sub_process, current_user, db)

@router.put("/sub-processes/{sub_process_id}", response_model=schemas.ApplicationSubProcessSchema)
def update_sub_process(sub_process_id: int, status_update: schemas.SubProcessUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return application_service.update_sub_process(sub_process_id, status_update, current_user, db)

from fastapi import UploadFile, File
import uuid
from app.core.s3 import MinioClient
from app.companies import models

@router.post("/sub-processes/{sub_process_id}/upload")
def upload_subprocess_deliverable(
    sub_process_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Verify sub-process
    db_sub = db.query(models.ApplicationSubProcess).filter(models.ApplicationSubProcess.id == sub_process_id).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="SubProcess not found")
        
    # Validar permisos (Solo el egresado postulante o un admin)
    if current_user["role_id"] == 3:
        db_app = db.query(models.CandidateApplication).filter(
            models.CandidateApplication.id == db_sub.application_id,
            models.CandidateApplication.graduate_id == current_user["id"]
        ).first()
        if not db_app:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Unauthorized to upload to this sub-process")
            
    try:
        minio_client = MinioClient.get_client()
        bucket_name = "subprocess-deliverables"
        
        # Crear bucket si no existe
        try:
            minio_client.head_bucket(Bucket=bucket_name)
        except:
            minio_client.create_bucket(Bucket=bucket_name)
            
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        file_key = f"deliverable_{sub_process_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        minio_client.upload_fileobj(
            file.file,
            bucket_name,
            file_key,
            ExtraArgs={"ContentType": file.content_type}
        )
        
        # En Minio (y S3) público, la URL sería:
        minio_url = MinioClient().minio_url
        file_url = f"{minio_url}/{bucket_name}/{file_key}"
        
        db_sub.archivo_respuesta = file_url
        db_sub.estado = models.SubProcessStatus.en_progreso
        db.commit()
        db.refresh(db_sub)
        
        return {"message": "File uploaded successfully", "archivo_respuesta": file_url}
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

from app.companies.internal_router import internal_router
from datetime import datetime

@internal_router.get("/applications/graduate/{graduate_id}")
def get_applications_by_graduate_internal(graduate_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func
    from app.companies import models
    
    apps = db.query(models.CandidateApplication).options(
        joinedload(models.CandidateApplication.job_offer)
        .joinedload(models.JobOffer.company)
        .joinedload(models.Company.sector),
        joinedload(models.CandidateApplication.job_offer)
        .joinedload(models.JobOffer.company)
        .joinedload(models.Company.city),
        joinedload(models.CandidateApplication.sub_processes)
    ).filter(
        models.CandidateApplication.graduate_id == graduate_id
    ).all()
    
    job_ids = [app.job_offer_id for app in apps]
    counts = {}
    if job_ids:
        results = db.query(
            models.CandidateApplication.job_offer_id,
            func.count(models.CandidateApplication.id)
        ).filter(
            models.CandidateApplication.job_offer_id.in_(job_ids)
        ).group_by(
            models.CandidateApplication.job_offer_id
        ).all()
        counts = dict(results)
    
    result = []
    for app in apps:
        app_dict = {k: v for k, v in app.__dict__.items() if not k.startswith('_')}
        app_dict["sub_processes"] = [
            {k: v for k, v in sp.__dict__.items() if not k.startswith('_')}
            for sp in app.sub_processes
        ]
        
        job_dict = {k: v for k, v in app.job_offer.__dict__.items() if not k.startswith('_')}
        
        comp_dict = {k: v for k, v in app.job_offer.company.__dict__.items() if not k.startswith('_')}
        comp_dict["sector"] = {k: v for k, v in app.job_offer.company.sector.__dict__.items() if not k.startswith('_')}
        comp_dict["city"] = {k: v for k, v in app.job_offer.company.city.__dict__.items() if not k.startswith('_')}
        
        job_dict["company"] = comp_dict
        job_dict["applicants_count"] = counts.get(app.job_offer_id, 0)
        
        app_dict["job_offer"] = job_dict
        result.append(app_dict)
        
    return result

@internal_router.post("/applications/apply")
def apply_internal(payload: dict, db: Session = Depends(get_db)):
    from app.companies import models
    from fastapi import HTTPException
    
    graduate_id = payload.get("graduate_id")
    job_offer_id = payload.get("job_offer_id")
    
    existing = db.query(models.CandidateApplication).filter(
        models.CandidateApplication.job_offer_id == job_offer_id,
        models.CandidateApplication.graduate_id == graduate_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya te has postulado a esta vacante")
    
    new_app = models.CandidateApplication(
        job_offer_id=job_offer_id,
        graduate_id=graduate_id,
        application_date=datetime.now()
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app

@internal_router.get("/applications")
def get_all_applications_internal(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    from app.companies import models
    return db.query(models.CandidateApplication).options(
        joinedload(models.CandidateApplication.job_offer)
        .joinedload(models.JobOffer.company)
        .joinedload(models.Company.sector),
        joinedload(models.CandidateApplication.job_offer)
        .joinedload(models.JobOffer.company)
        .joinedload(models.Company.city),
    ).all()
