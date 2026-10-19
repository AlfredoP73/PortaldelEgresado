from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.rbac import RoleChecker
from app.graduates import schemas
from app.graduates.services import misc_service

require_graduate = RoleChecker(["GRADUATE"])

router = APIRouter(
    prefix="/api/modulo1",
    tags=["Empleo y Encuestas"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/jobs", response_model=List[schemas.JobOffer])
def get_jobs(skip: int = 0, limit: int = 100, q: Optional[str] = None, salary_min: Optional[int] = None, db: Session = Depends(get_db)):
    return misc_service.get_jobs(skip, limit, q, salary_min, db)

@router.post("/applications", response_model=schemas.Application, dependencies=[Depends(require_graduate)])
def apply_for_job(application: schemas.ApplicationCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.apply_for_job(application, current_user, db)

@router.get("/my-applications", response_model=List[schemas.Application], dependencies=[Depends(require_graduate)])
def get_my_applications(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_my_applications(current_user, db)

@router.get("/surveys", response_model=List[schemas.Survey], dependencies=[Depends(require_graduate)])
def get_surveys(db: Session = Depends(get_db)):
    return misc_service.get_surveys(db)

@router.get("/surveys/{survey_id}/response", dependencies=[Depends(require_graduate)])
def get_survey_response(survey_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_survey_response(survey_id, current_user, db)

@router.post("/surveys/{survey_id}/response", response_model=schemas.SurveyResponse, dependencies=[Depends(require_graduate)])
def submit_survey_response(survey_id: int, answers: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.submit_survey_response(survey_id, answers, current_user, db)

@router.get("/saved-jobs")
def get_saved_jobs(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_saved_jobs(current_user, db)

@router.post("/saved-jobs/{job_offer_id}")
def toggle_saved_job(job_offer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.toggle_saved_job(job_offer_id, current_user, db)

@router.get("/jobs/{job_offer_id}/affinity-breakdown")
def get_job_affinity_breakdown(job_offer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_job_affinity_breakdown(job_offer_id, current_user, db)

@router.get("/companies-directory")
def get_companies_directory(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_companies_directory(db)

@router.get("/jobs/{job_offer_id}/interview-prep")
def get_interview_prep(job_offer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return misc_service.get_interview_prep(job_offer_id, current_user, db)

