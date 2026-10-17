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
        import os
        minio_client = MinioClient.get_client()
        bucket_name = os.getenv("S3_BUCKET_DELIVERABLES", "subprocess-deliverables")
        
        # El bucket ya fue creado por deploy.ps1, solo verificar
        try:
            minio_client.head_bucket(Bucket=bucket_name)
        except:
            pass  # Si no existe, el upload fallará con error descriptivo
            
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        file_key = f"deliverable_{sub_process_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        minio_client.upload_fileobj(
            file.file,
            bucket_name,
            file_key,
            ExtraArgs={"ContentType": file.content_type}
        )
        
        # Generar presigned URL válida por 7 días (604800 seg)
        file_url = minio_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file_key},
            ExpiresIn=604800
        )
        
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

    # Auto-asignar subprocesos configurados para la etapa inicial POSTULADO
    job_offer = db.query(models.JobOffer).filter(models.JobOffer.id == job_offer_id).first()
    if job_offer and job_offer.sub_processes_config:
        templates = job_offer.sub_processes_config.get(models.ApplicationStatus.POSTULADO.value, [])
        for sp_template in templates:
            new_sp = models.ApplicationSubProcess(
                application_id=new_app.id,
                tipo=sp_template.get("tipo"),
                nombre=sp_template.get("nombre"),
                descripcion=sp_template.get("descripcion"),
                etapa_kanban=models.ApplicationStatus.POSTULADO.value,
                fecha_limite=sp_template.get("fecha_limite"),
                es_formulario=sp_template.get("es_formulario", False),
                preguntas_json=sp_template.get("preguntas_json"),
                enlace_adjunto=sp_template.get("enlace_adjunto")
            )
            db.add(new_sp)
        db.commit()
        db.refresh(new_app)

    return new_app

@internal_router.post("/integrations/upc-job-board/sync-job")
def sync_external_job_offer(payload: dict, db: Session = Depends(get_db)):
    """
    Endpoint del microservicio Companies para sincronizar vacantes publicadas por empresas
    en la Bolsa de Empleo de la UPC y disparar el cálculo de afinidad hacia el microservicio Matchmaking vía RabbitMQ.
    """
    from app.companies import models
    from app.core.adapters import RabbitMQMatchmakingAdapter
    from datetime import date

    company_id = payload.get("company_id")
    title = payload.get("title")
    job_offer = models.JobOffer(
        company_id=company_id,
        title=title,
        description=payload.get("description", ""),
        requirements=payload.get("requirements", ""),
        functions=payload.get("functions", ""),
        salary_min=payload.get("salary_min"),
        salary_max=payload.get("salary_max"),
        min_experience_years=payload.get("min_experience_years", 0),
        modality=payload.get("modality", "Presencial"),
        contract_type=payload.get("contract_type", "Indefinido"),
        program_id=payload.get("program_id", 1),
        closing_date=payload.get("closing_date") or date.today(),
        available_slots=payload.get("available_slots", 1),
        status=models.JobOfferStatus.ACTIVE,
        sub_processes_config=payload.get("sub_processes_config", {})
    )
    db.add(job_offer)
    db.commit()
    db.refresh(job_offer)

    # Publicar evento en RabbitMQ hacia el microservicio Matchmaking
    try:
        RabbitMQMatchmakingAdapter().trigger_recalculate(job_offer_id=job_offer.id)
    except Exception as e:
        print(f"Matchmaking warning: {e}")

    return job_offer

@internal_router.post("/integrations/upc-job-board/webhook/application-stage")
def sync_external_application_stage(payload: dict, db: Session = Depends(get_db)):
    """
    Webhook / Endpoint de comunicación con el servicio externo de Bolsa de Empleo de la UPC.
    Permite actualizar la etapa (POSTULADO -> EN_EVALUACION -> ENTREVISTADO -> CONTRATADO / RECHAZADO),
    asignar automáticamente las plantillas de subprocesos de la nueva etapa y notificar al egresado.
    """
    from app.companies import models
    from fastapi import HTTPException

    application_id = payload.get("application_id")
    new_status = payload.get("status")
    rejection_reason = payload.get("rejection_reason")
    sub_processes = payload.get("sub_processes", [])

    db_app = db.query(models.CandidateApplication).filter(
        models.CandidateApplication.id == application_id
    ).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    if new_status:
        db_app.status = models.ApplicationStatus(new_status)
    if rejection_reason is not None:
        db_app.rejection_reason = rejection_reason

    # Auto-asignar plantillas de la vacante para la nueva etapa si están configuradas
    job_offer = db_app.job_offer
    if job_offer and job_offer.sub_processes_config:
        templates = job_offer.sub_processes_config.get(db_app.status.value, [])
        for sp_template in templates:
            existing = db.query(models.ApplicationSubProcess).filter(
                models.ApplicationSubProcess.application_id == db_app.id,
                models.ApplicationSubProcess.nombre == sp_template.get("nombre"),
                models.ApplicationSubProcess.etapa_kanban == db_app.status.value
            ).first()
            if not existing:
                db.add(models.ApplicationSubProcess(
                    application_id=db_app.id,
                    tipo=sp_template.get("tipo", models.SubProcessType.otro.value),
                    nombre=sp_template.get("nombre"),
                    descripcion=sp_template.get("descripcion"),
                    etapa_kanban=db_app.status.value,
                    fecha_limite=sp_template.get("fecha_limite"),
                    es_formulario=sp_template.get("es_formulario", False),
                    preguntas_json=sp_template.get("preguntas_json"),
                    enlace_adjunto=sp_template.get("enlace_adjunto")
                ))

    # Sincronizar o agregar subprocesos enviados desde la Bolsa de Empleo UPC
    for sp_data in sub_processes:
        stage_name = sp_data.get("etapa_kanban") or db_app.status.value
        existing_sp = db.query(models.ApplicationSubProcess).filter(
            models.ApplicationSubProcess.application_id == db_app.id,
            models.ApplicationSubProcess.nombre == sp_data.get("nombre"),
            models.ApplicationSubProcess.etapa_kanban == stage_name
        ).first()
        if existing_sp:
            if "estado" in sp_data:
                existing_sp.estado = sp_data["estado"]
            if "score" in sp_data:
                existing_sp.score = sp_data["score"]
            if "descripcion" in sp_data:
                existing_sp.descripcion = sp_data["descripcion"]
            if "enlace_adjunto" in sp_data:
                existing_sp.enlace_adjunto = sp_data["enlace_adjunto"]
        else:
            db.add(models.ApplicationSubProcess(
                application_id=db_app.id,
                tipo=sp_data.get("tipo", models.SubProcessType.otro.value),
                nombre=sp_data.get("nombre", "Actividad de evaluación"),
                descripcion=sp_data.get("descripcion"),
                etapa_kanban=stage_name,
                estado=sp_data.get("estado", models.SubProcessStatus.pendiente.value),
                es_formulario=sp_data.get("es_formulario", False),
                preguntas_json=sp_data.get("preguntas_json"),
                enlace_adjunto=sp_data.get("enlace_adjunto"),
                score=sp_data.get("score"),
            ))

    # Notificar al egresado cuando avanza de etapa o llega al final (CONTRATADO / RECHAZADO)
    try:
        from app.auth.models import Notification
        job_title = job_offer.title if job_offer else f"Vacante #{db_app.job_offer_id}"
        title = "¡Has sido Contratado!" if db_app.status == models.ApplicationStatus.CONTRATADO else "Actualización de tu postulación"
        msg = f"Tu proceso en la vacante '{job_title}' avanzó a la etapa {db_app.status.value}."
        if db_app.status == models.ApplicationStatus.RECHAZADO and db_app.rejection_reason:
            msg += f" Motivo: {db_app.rejection_reason}"
        db.add(Notification(
            user_id=db_app.graduate_id,
            title=title,
            message=msg,
            type="application_update"
        ))
    except Exception as e:
        print(f"Error creating notification: {e}")

    db.commit()
    db.refresh(db_app)
    return {"message": "Etapa y subprocesos sincronizados con Bolsa de Empleo UPC", "application_id": db_app.id, "status": db_app.status}

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
