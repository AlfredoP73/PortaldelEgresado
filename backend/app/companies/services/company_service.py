from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.companies import models, schemas

def create_company(company: schemas.CompanyCreate, current_user: dict, db: Session):
    user_id = company.user_id if (current_user["role_id"] == 1 and company.user_id) else current_user["id"]
    if not user_id:
        raise HTTPException(status_code=400, detail="Falta user_id para la empresa")
    
    if db.query(models.Company).filter(models.Company.user_id == user_id).first():
        raise HTTPException(status_code=400, detail="La empresa ya tiene un perfil registrado")

    company_data = company.model_dump(exclude={"user_id"})
    db_company = models.Company(**company_data, user_id=user_id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def get_companies(skip: int, limit: int, current_user: dict, db: Session):
    from sqlalchemy.orm import joinedload
    q = db.query(models.Company).options(
        joinedload(models.Company.sector),
        joinedload(models.Company.city),
    )
    if current_user["role_id"] == 1: # ADMIN
        return q.offset(skip).limit(limit).all()
    # COMPANY can only see themselves
    return q.filter(models.Company.user_id == current_user["id"]).all()

def update_company_status(company_id: int, status_update: schemas.CompanyUpdateStatus, db: Session):
    db_company = db.query(models.Company).filter(models.Company.user_id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db_company.status = status_update.status
    db.commit()
    db.refresh(db_company)
    return db_company

def update_company(company_id: int, company_update: schemas.CompanyCreate, db: Session):
    db_company = db.query(models.Company).filter(models.Company.user_id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = company_update.model_dump(exclude_unset=True, exclude={"user_id"})
    for key, value in update_data.items():
        setattr(db_company, key, value)
        
    db.commit()
    db.refresh(db_company)
    return db_company

def delete_company(company_id: int, db: Session):
    db_company = db.query(models.Company).filter(models.Company.user_id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(db_company)
    db.commit()
    return None
