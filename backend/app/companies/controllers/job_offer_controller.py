from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.rbac import RoleChecker
from app.companies import schemas
from app.companies.services import job_offer_service

require_company = RoleChecker(["COMPANY"])
require_admin_or_company = RoleChecker(["ADMIN", "COMPANY"])

router = APIRouter(
    prefix="/api/modulo2",
    tags=["Vacantes"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/jobs", response_model=schemas.JobOffer, dependencies=[Depends(require_company)])
def create_job_offer(job: schemas.JobOfferCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return job_offer_service.create_job_offer(job, current_user, db)

@router.get("/jobs", response_model=List[schemas.JobOffer], dependencies=[Depends(require_admin_or_company)])
def get_job_offers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return job_offer_service.get_job_offers(skip, limit, current_user, db)

from app.companies.internal_router import internal_router
from typing import Optional

@internal_router.get("/jobs", response_model=List[schemas.JobOffer])
def get_jobs_internal(skip: int = 0, limit: int = 100, q: Optional[str] = None, salary_min: Optional[int] = None, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload, selectinload
    from app.companies import models
    query = db.query(models.JobOffer).options(
        joinedload(models.JobOffer.company).joinedload(models.Company.sector),
        joinedload(models.JobOffer.company).joinedload(models.Company.city),
        joinedload(models.JobOffer.program),
        selectinload(models.JobOffer.skills),
    ).filter(models.JobOffer.status == models.JobOfferStatus.ACTIVE)
    if q:
        query = query.filter(models.JobOffer.title.ilike(f"%{q}%"))
    if salary_min:
        query = query.filter(models.JobOffer.salary_min >= salary_min)
    return query.offset(skip).limit(limit).all()

from fastapi import HTTPException

@internal_router.get("/matchmaking/jobs")
def get_matchmaking_job_ids(db: Session = Depends(get_db)):
    from app.companies import models
    ids = db.query(models.JobOffer.id).filter(models.JobOffer.status == models.JobOfferStatus.ACTIVE).all()
    return [r[0] for r in ids]

@internal_router.get("/matchmaking/jobs/{job_offer_id}")
def get_matchmaking_job(job_offer_id: int, db: Session = Depends(get_db)):
    from app.companies import models
    job = db.query(models.JobOffer).filter(models.JobOffer.id == job_offer_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Matching service expects a dictionary with required_skills
    return {
        "id": job.id,
        "company_id": job.company_id,
        "title": job.title,
        "program_id": job.program_id,
        "min_experience_years": job.min_experience_years or 0,
        "status": job.status,
        "company_sector": job.company.sector_id if job.company else None,
        "company_name": job.company.name if job.company else None,
        "required_skills": {sk.skill_id: sk.required_level for sk in job.skills}
    }
