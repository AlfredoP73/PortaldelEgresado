from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.matchmaking import schemas
from app.matchmaking.deps import (
    require_any_owner,
    require_company_or_admin,
    require_graduate_or_admin,
    require_graduate_owner_or_admin,
    require_internal_or_admin,
)
from app.matchmaking.services import matching_service, benchmark_service

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post("/recalcular", response_model=list[schemas.MatchOut], dependencies=[Depends(require_internal_or_admin)])
def recalcular(payload: schemas.RecalcularRequest, db: Session = Depends(get_db)):
    """
    Trigger llamado por los microservicios `companies` (al crear/editar
    una vacante) y `graduates` (al actualizar el perfil/hoja de vida), o
    por un administrador desde el frontend.
    """
    if payload.graduate_id:
        return matching_service.recalcular_por_egresado(db, payload.graduate_id)
    if payload.job_offer_id:
        return matching_service.recalcular_por_vacante(db, payload.job_offer_id)
    raise HTTPException(status_code=400, detail="Debe enviar graduate_id o job_offer_id")


@router.get("/graduate/{graduate_id}", response_model=list[schemas.MatchOut], dependencies=[Depends(require_graduate_owner_or_admin)])
def vacantes_recomendadas(graduate_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Vacantes ordenadas por afinidad para un egresado."""
    return matching_service.obtener_vacantes_recomendadas(db, graduate_id, limit)


@router.get("/vacancy/{job_offer_id}", response_model=list[schemas.MatchOut], dependencies=[Depends(require_company_or_admin)])
def candidatos_recomendados(job_offer_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """Egresados ordenados por afinidad para una vacante (vista de la empresa)."""
    return matching_service.obtener_candidatos_recomendados(db, job_offer_id, limit)


@router.get("/graduate/{graduate_id}/vacancy/{job_offer_id}", response_model=schemas.MatchOut, dependencies=[Depends(require_any_owner)])
def match_puntual(graduate_id: int, job_offer_id: int, db: Session = Depends(get_db)):
    """Calcula (o recalcula) el match entre un egresado y una vacante específicos."""
    match = matching_service.calcular_match_individual(db, graduate_id, job_offer_id)
    if not match:
        raise HTTPException(status_code=404, detail="Egresado o vacante no encontrados")
    return match


@router.get("/benchmark/{job_offer_id}", dependencies=[Depends(require_graduate_or_admin)])
def benchmark_vacante(
    job_offer_id: int,
    include_ai: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Radiografía de competencia en vivo para el egresado frente a los demás postulantes de una vacante."""
    return benchmark_service.get_applicant_benchmark(
        db=db,
        job_offer_id=job_offer_id,
        graduate_id=current_user["id"],
        include_ai=include_ai,
    )