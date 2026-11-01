from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.companies import models, schemas

from app.core.adapters import RabbitMQMatchmakingAdapter

def create_job_offer(body: schemas.JobOfferCreate, current_user: dict, db: Session):
    company = db.query(models.Company).filter(models.Company.user_id == current_user["id"]).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    db_offer = models.JobOffer(
        company_id=company.user_id,
        title=body.title,
        description=body.description,
        requirements=body.requirements,
        functions=body.functions,
        program_id=body.program_id,
        min_experience_years=body.min_experience_years,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        closing_date=body.closing_date,
        status="ACTIVE"
    )
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)

    # Save skills
    for req_skill in body.required_skills:
        skill = models.JobOfferSkill(
            job_offer_id=db_offer.id,
            skill_id=req_skill.skill_id,
            required_level=req_skill.required_level
        )
        db.add(skill)
    db.commit()

    adapter = RabbitMQMatchmakingAdapter()
    try:
        adapter.trigger_recalculate(job_offer_id=db_offer.id)
    except Exception as e:
        print(f"Matchmaking warning: {e}")

    return db_offer

def get_job_offers(skip: int, limit: int, current_user: dict, db: Session):
    from sqlalchemy.orm import joinedload, selectinload
    q = db.query(models.JobOffer).options(
        joinedload(models.JobOffer.company).joinedload(models.Company.sector),
        joinedload(models.JobOffer.company).joinedload(models.Company.city),
        joinedload(models.JobOffer.program),
        selectinload(models.JobOffer.skills),
    )
    if current_user["role_id"] == 1: # ADMIN
        return q.offset(skip).limit(limit).all()
    return q.filter(models.JobOffer.company_id == current_user["id"]).offset(skip).limit(limit).all()
