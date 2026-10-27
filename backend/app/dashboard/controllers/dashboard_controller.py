from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.utils.auth_utils import get_current_user
from app.auth.rbac import RBACProxy

from app.dashboard import schemas
from app.dashboard.services.dashboard_facade import DashboardFacade


require_admin = RBACProxy(["ADMIN"])
require_company = RBACProxy(["COMPANY"])
require_graduate = RBACProxy(["GRADUATE"])
require_admin_or_graduate = RBACProxy(["ADMIN", "GRADUATE"])


class AnalyticsFilterBody(BaseModel):
    program_id: Optional[int] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    modality: Optional[str] = None

router = APIRouter(
    prefix="/api",
    tags=["Dashboard Administrativo"],
    dependencies=[Depends(get_current_user)]
)


@router.get(
    "/dashboard",
    response_model=schemas.DashboardResponse,
    dependencies=[Depends(require_admin)]
)
def get_dashboard(
    program_id: int = Query(None),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    facade = DashboardFacade(db)
    return facade.get_admin_dashboard(program_id, year)

@router.get(
    "/dashboard/admin/analytics",
    dependencies=[Depends(require_admin)]
)
def get_executive_bi_analytics(
    program_id: int = Query(None),
    year_min: int = Query(None),
    year_max: int = Query(None),
    modality: str = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Dashboard Ejecutivo de Analítica y Business Intelligence (Estilo Power BI / Tableau).
    Soporta segmentadores interactivos (slicers) por programa, cohorte y modalidad.
    """
    facade = DashboardFacade(db)
    return facade.get_executive_analytics(program_id, year_min, year_max, modality)


@router.post(
    "/dashboard/admin/analytics/insights",
    dependencies=[Depends(require_admin)]
)
def get_executive_bi_insights(
    body: Optional[AnalyticsFilterBody] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    facade = DashboardFacade(db)
    return facade.get_executive_insights(
        user_id=current_user["id"],
        program_id=body.program_id if body else None,
        year_min=body.year_min if body else None,
        year_max=body.year_max if body else None,
        modality=body.modality if body else None,
    )


@router.get(
    "/dashboard/cohorts",
    dependencies=[Depends(require_admin_or_graduate)]
)
def get_cohort_heatmap(
    program_id: int = Query(None),
    year_min: int = Query(None),
    year_max: int = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    audience = "admin" if current_user.get("role_id") == 1 else "graduate"
    facade = DashboardFacade(db)
    return facade.get_cohort_heatmap(
        audience=audience,
        program_id=program_id,
        year_min=year_min,
        year_max=year_max,
    )


@router.post(
    "/dashboard/cohorts/insights",
    dependencies=[Depends(require_admin_or_graduate)]
)
def get_cohort_insights(
    body: Optional[AnalyticsFilterBody] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    audience = "admin" if current_user.get("role_id") == 1 else "graduate"
    facade = DashboardFacade(db)
    return facade.get_cohort_insights(
        user_id=current_user["id"],
        audience=audience,
        program_id=body.program_id if body else None,
        year_min=body.year_min if body else None,
        year_max=body.year_max if body else None,
    )

@router.get(
    "/company/dashboard",
    response_model=schemas.CompanyDashboardResponse,
    dependencies=[Depends(require_company)]
)
def get_company_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    facade = DashboardFacade(db)
    return facade.get_company_dashboard(current_user["id"])

@router.get(
    "/graduate/dashboard",
    response_model=schemas.GraduateDashboardResponse,
    dependencies=[Depends(require_graduate)]
)
def get_graduate_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    facade = DashboardFacade(db)
    return facade.get_graduate_dashboard(current_user["id"])