from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from app.companies import models, schemas
from app.core.adapters import HttpGraduatesAdapter

graduates_adapter = HttpGraduatesAdapter()

def create_application(app: schemas.ApplicationCreate, db: Session):
    db_app = models.CandidateApplication(**app.model_dump())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    # Auto-assign templates for POSTULADO stage
    job_offer = db.query(models.JobOffer).filter(models.JobOffer.id == app.job_offer_id).first()
    if job_offer and job_offer.sub_processes_config:
        templates = job_offer.sub_processes_config.get(models.ApplicationStatus.POSTULADO.value, [])
        for sp_template in templates:
            # We must map fields. sp_template is a dict.
            new_sp = models.ApplicationSubProcess(
                application_id=db_app.id,
                tipo=sp_template.get("tipo"),
                nombre=sp_template.get("nombre"),
                descripcion=sp_template.get("descripcion"),
                etapa_kanban=sp_template.get("etapa_kanban"),
                fecha_limite=sp_template.get("fecha_limite"),
                es_formulario=sp_template.get("es_formulario", False),
                preguntas_json=sp_template.get("preguntas_json"),
                enlace_adjunto=sp_template.get("enlace_adjunto")
            )
            db.add(new_sp)
        db.commit()
        
    return db_app

def get_applications_by_job(job_offer_id: int, current_user: dict, db: Session):
    if current_user["role_id"] != 1: # If not Admin, verify company owns this job offer
        job = db.query(models.JobOffer).filter(models.JobOffer.id == job_offer_id, models.JobOffer.company_id == current_user["id"]).first()
        if not job:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta vacante")
    
    applications = db.query(models.CandidateApplication).options(
        joinedload(models.CandidateApplication.sub_processes)
    ).filter(
        models.CandidateApplication.job_offer_id == job_offer_id
    ).all()
    
    try:
        all_graduates_list = graduates_adapter.get_all_graduates()
        all_graduates = {g["user_id"]: g for g in all_graduates_list}
    except Exception as e:
        print(f"Error fetching graduates data: {e}")
        all_graduates = {}
        
    try:
        from app.matchmaking.models import Match
        matches = db.query(Match).filter(Match.job_offer_id == job_offer_id).all()
        match_scores = {m.graduate_id: m.score for m in matches}
    except Exception as e:
        print(f"Error fetching match scores: {e}")
        match_scores = {}
        
    result = []
    for app in applications:
        app_dict = {k: v for k, v in app.__dict__.items() if not k.startswith('_')}
        app_dict["graduate"] = all_graduates.get(app.graduate_id)
        app_dict["match_score"] = float(match_scores.get(app.graduate_id, 0.0))
        app_dict["sub_processes"] = [
            {k: v for k, v in sp.__dict__.items() if not k.startswith('_')} 
            for sp in app.sub_processes
        ]
        result.append(app_dict)
        
    return result

def update_application_status(application_id: int, status_update: schemas.ApplicationUpdateStatus, current_user: dict, db: Session):
    db_app = db.query(models.CandidateApplication).join(models.JobOffer).filter(
        models.CandidateApplication.id == application_id,
        models.JobOffer.company_id == current_user["id"]
    ).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")
    
    db_app.status = status_update.status
    if status_update.rejection_reason is not None:
        db_app.rejection_reason = status_update.rejection_reason
        
    db.commit()
    db.refresh(db_app)
    
    # Notificar al egresado
    if db_app.status in [models.ApplicationStatus.RECHAZADO, models.ApplicationStatus.CONTRATADO]:
        try:
            from app.auth.models import Notification
            title = "Has sido Contratado!" if db_app.status == models.ApplicationStatus.CONTRATADO else "Actualización de tu postulación"
            msg = f"Tu estado en la vacante '{db_app.job_offer.title}' ha cambiado a {db_app.status.value}."
            if db_app.status == models.ApplicationStatus.RECHAZADO and db_app.rejection_reason:
                msg += f" Motivo: {db_app.rejection_reason}"
            notif = Notification(
                user_id=db_app.graduate_id,
                title=title,
                message=msg,
                type="application_update"
            )
            db.add(notif)
            db.commit()
        except Exception as e:
            print(f"Error creating notification: {e}")
            db.rollback()
    
    # Auto-assign templates for the new stage
    job_offer = db_app.job_offer
    if job_offer and job_offer.sub_processes_config:
        templates = job_offer.sub_processes_config.get(db_app.status.value, [])
        for sp_template in templates:
            # Check if exists
            existing = db.query(models.ApplicationSubProcess).filter(
                models.ApplicationSubProcess.application_id == db_app.id,
                models.ApplicationSubProcess.nombre == sp_template.get("nombre"),
                models.ApplicationSubProcess.etapa_kanban == db_app.status.value
            ).first()
            if not existing:
                new_sp = models.ApplicationSubProcess(
                    application_id=db_app.id,
                    tipo=sp_template.get("tipo"),
                    nombre=sp_template.get("nombre"),
                    descripcion=sp_template.get("descripcion"),
                    etapa_kanban=sp_template.get("etapa_kanban"),
                    fecha_limite=sp_template.get("fecha_limite"),
                    es_formulario=sp_template.get("es_formulario", False),
                    preguntas_json=sp_template.get("preguntas_json"),
                    enlace_adjunto=sp_template.get("enlace_adjunto")
                )
                db.add(new_sp)
        db.commit()
    
    if db_app.status == models.ApplicationStatus.CONTRATADO:
        job_offer = db_app.job_offer
        hired_count = db.query(models.CandidateApplication).filter(
            models.CandidateApplication.job_offer_id == job_offer.id,
            models.CandidateApplication.status == models.ApplicationStatus.CONTRATADO
        ).count()
        
        if hired_count >= job_offer.available_slots and job_offer.status != models.JobOfferStatus.CLOSED:
            job_offer.status = models.JobOfferStatus.CLOSED
            
            # Reject all other applications for this job offer
            other_apps = db.query(models.CandidateApplication).filter(
                models.CandidateApplication.job_offer_id == job_offer.id,
                models.CandidateApplication.status != models.ApplicationStatus.CONTRATADO
            ).all()
            for other_app in other_apps:
                other_app.status = models.ApplicationStatus.RECHAZADO
            
            db.commit()
            
    return db_app

def bulk_update_application_status(update_data: schemas.BulkApplicationUpdate, current_user: dict, db: Session):
    updated = []
    for app_id in update_data.application_ids:
        try:
            status_update = schemas.ApplicationUpdateStatus(
                status=update_data.status,
                rejection_reason=update_data.rejection_reason
            )
            # update_application_status returns the db_app
            updated_app = update_application_status(app_id, status_update, current_user, db)
            updated.append(updated_app)
        except HTTPException:
            # Skip applications they don't have access to or don't exist
            continue
    return updated

def get_application_candidate(application_id: int, current_user: dict, db: Session):
    query = db.query(models.CandidateApplication).filter(models.CandidateApplication.id == application_id)
    if current_user["role_id"] != 1:
        query = query.join(models.JobOffer).filter(models.JobOffer.company_id == current_user["id"])
    
    app = query.first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")
        
    try:
        candidate_dict = graduates_adapter.get_graduate(app.graduate_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching candidate data: {str(e)}")
    
    return candidate_dict

def get_talent_pool(db: Session):
    try:
        return graduates_adapter.get_all_graduates()
    except Exception as e:
        return []

def create_global_sub_process(job_id: int, stage: str, sub_process: schemas.SubProcessBase, current_user: dict, db: Session):
    from sqlalchemy.orm.attributes import flag_modified
    import copy
    
    job_offer = db.query(models.JobOffer).filter(
        models.JobOffer.id == job_id,
        models.JobOffer.company_id == current_user["id"]
    ).first()
    if not job_offer:
        raise HTTPException(status_code=404, detail="Job offer not found or unauthorized")
        
    # 1. Update global config for this stage
    config = copy.deepcopy(job_offer.sub_processes_config) if job_offer.sub_processes_config else {}
    stage_list = config.get(stage, [])
    # Check if a sub-process with this name already exists in the template
    if not any(sp.get("nombre") == sub_process.nombre for sp in stage_list):
        sp_dict = sub_process.model_dump()
        sp_dict["etapa_kanban"] = stage # ensure stage matches
        # Convert datetime to string for JSON serialization
        if sp_dict.get("fecha_limite"):
            sp_dict["fecha_limite"] = sp_dict["fecha_limite"].isoformat()
        if "tipo" in sp_dict and hasattr(sp_dict["tipo"], "value"):
            sp_dict["tipo"] = sp_dict["tipo"].value
        stage_list.append(sp_dict)
        config[stage] = stage_list
        job_offer.sub_processes_config = config
        flag_modified(job_offer, "sub_processes_config")
        db.commit()

    # 2. Broadcast to all applications in this stage
    applications_in_stage = db.query(models.CandidateApplication).filter(
        models.CandidateApplication.job_offer_id == job_offer.id,
        models.CandidateApplication.status == stage
    ).all()
    
    count = 0
    for app in applications_in_stage:
        # Check if they already have it
        existing = db.query(models.ApplicationSubProcess).filter(
            models.ApplicationSubProcess.application_id == app.id,
            models.ApplicationSubProcess.nombre == sub_process.nombre,
            models.ApplicationSubProcess.etapa_kanban == stage
        ).first()
        
        if not existing:
            new_sp = models.ApplicationSubProcess(**sub_process.model_dump(), application_id=app.id)
            new_sp.etapa_kanban = stage
            db.add(new_sp)
            count += 1
                
    db.commit()
    
    return {"message": "Sub-process created globally", "broadcasted_to": count}

def update_sub_process(sub_process_id: int, status_update: schemas.SubProcessUpdate, current_user: dict, db: Session):
    db_sub = db.query(models.ApplicationSubProcess).filter(models.ApplicationSubProcess.id == sub_process_id).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="SubProcess not found")
        
    # Validar permisos
    if current_user["role_id"] == 1:
        pass # Admin can edit
    elif current_user["role_id"] == 2:
        # Check company ownership
        db_app = db.query(models.CandidateApplication).join(models.JobOffer).filter(
            models.CandidateApplication.id == db_sub.application_id,
            models.JobOffer.company_id == current_user["id"]
        ).first()
        if not db_app:
            raise HTTPException(status_code=404, detail="Unauthorized")
    elif current_user["role_id"] == 3:
        # Check graduate ownership
        db_app = db.query(models.CandidateApplication).filter(
            models.CandidateApplication.id == db_sub.application_id,
            models.CandidateApplication.graduate_id == current_user["id"]
        ).first()
        if not db_app:
            raise HTTPException(status_code=404, detail="Unauthorized")
    
    if status_update.estado is not None:
        db_sub.estado = status_update.estado
    if status_update.respuestas_json is not None:
        db_sub.respuestas_json = status_update.respuestas_json
    if status_update.score is not None:
        db_sub.score = status_update.score
        
    db.commit()
    db.refresh(db_sub)
    
    # Notificar al egresado
    if db_sub.estado in [models.SubProcessStatus.aprobado, models.SubProcessStatus.rechazado]:
        try:
            db_app = db.query(models.CandidateApplication).filter(models.CandidateApplication.id == db_sub.application_id).first()
            if db_app:
                from app.auth.models import Notification
                title = "Resultado de Evaluación"
                msg = f"Tu prueba '{db_sub.nombre}' ha sido calificada como {db_sub.estado.value}."
                if db_sub.score:
                    msg += f" Puntuación: {db_sub.score}/5."
                notif = Notification(
                    user_id=db_app.graduate_id,
                    title=title,
                    message=msg,
                    type="application_update"
                )
                db.add(notif)
                db.commit()
        except Exception as e:
            print(f"Error creating notification: {e}")
            db.rollback()
    
    # Check for automatic movement
    if db_sub.estado == models.SubProcessStatus.aprobado:
        db_app = db.query(models.CandidateApplication).filter(models.CandidateApplication.id == db_sub.application_id).first()
        if db_app:
            # Check if all sub-processes for the CURRENT stage of the application are approved
            current_stage_subs = db.query(models.ApplicationSubProcess).filter(
                models.ApplicationSubProcess.application_id == db_app.id,
                models.ApplicationSubProcess.etapa_kanban == db_app.status
            ).all()
            
            if current_stage_subs and all(sp.estado == models.SubProcessStatus.aprobado for sp in current_stage_subs):
                STAGE_ORDER = [
                    models.ApplicationStatus.POSTULADO.value, 
                    models.ApplicationStatus.EN_EVALUACION.value, 
                    models.ApplicationStatus.ENTREVISTADO.value, 
                    models.ApplicationStatus.CONTRATADO.value
                ]
                try:
                    current_index = STAGE_ORDER.index(db_app.status.value)
                    if current_index < len(STAGE_ORDER) - 1:
                        next_stage = STAGE_ORDER[current_index + 1]
                        # Move to next stage
                        status_update = schemas.ApplicationUpdateStatus(status=next_stage)
                        update_application_status(db_app.id, status_update, {"id": db_app.job_offer.company_id, "role_id": 2}, db)
                except ValueError:
                    pass

    return db_sub
