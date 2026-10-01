from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from typing import Optional
from datetime import datetime
from app.graduates import models, schemas
import app.companies.models as company_models
import httpx
from app.core.adapters import RabbitMQMatchmakingAdapter, HttpCompaniesAdapter

companies_adapter = HttpCompaniesAdapter()

def get_jobs(skip: int, limit: int, q: Optional[str], salary_min: Optional[int], db: Session):
    params = {"skip": skip, "limit": limit}
    if q: params["q"] = q
    if salary_min: params["salary_min"] = salary_min
    
    try:
        return companies_adapter.get_jobs(params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Companies: {str(e)}")

def apply_for_job(application: schemas.ApplicationCreate, current_user: dict, db: Session):
    try:
        return companies_adapter.apply_for_job({"graduate_id": current_user["id"], "job_offer_id": application.job_offer_id})
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            error_detail = e.response.json().get("detail", "Error en postulación")
            raise HTTPException(status_code=400, detail=error_detail)
        raise HTTPException(status_code=e.response.status_code, detail=f"Error desde Companies: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Companies: {str(e)}")

def get_my_applications(current_user: dict, db: Session):
    try:
        return companies_adapter.get_my_applications(current_user['id'])
    except Exception as e:
        print(f"ERROR in get_my_applications: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error conectando con Companies: {str(e)}")

def get_surveys(db: Session):
    return db.query(models.Survey).filter(models.Survey.is_active == True).all()

def get_survey_response(survey_id: int, current_user: dict, db: Session):
    response = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.survey_id == survey_id,
        models.SurveyResponse.graduate_id == current_user["id"]
    ).first()
    return response

def submit_survey_response(survey_id: int, answers: list, current_user: dict, db: Session):
    existing = db.query(models.SurveyResponse).filter_by(
        survey_id=survey_id, graduate_id=current_user["id"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya has respondido esta encuesta")
        
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    answers_dict = {a.question_id: a.answer for a in answers}
    new_response = models.SurveyResponse(
        survey_id=survey_id,
        graduate_id=current_user["id"],
        answers_json=answers_dict
    )
    db.add(new_response)
    db.commit()
    db.refresh(new_response)
    
    adapter = RabbitMQMatchmakingAdapter()
    adapter.trigger_recalculate(graduate_id=current_user["id"])
    
    return {"detail": "Encuesta enviada"}
