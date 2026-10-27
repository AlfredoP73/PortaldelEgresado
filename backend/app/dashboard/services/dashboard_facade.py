from sqlalchemy.orm import Session
from app.dashboard.services import dashboard_service

class DashboardFacade:
    """
    Facade for the Dashboard module.
    Provides a simplified interface to gather metrics from various underlying services and repositories.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_admin_dashboard(self, program_id: int = None, year: int = None):
        return dashboard_service.get_dashboard(self.db, program_id, year)

    def get_company_dashboard(self, company_id: int):
        return dashboard_service.get_company_dashboard(self.db, company_id)

    def get_graduate_dashboard(self, graduate_id: int):
        return dashboard_service.get_graduate_dashboard(self.db, graduate_id)

    def get_executive_analytics(self, program_id: int = None, year_min: int = None, year_max: int = None, modality: str = None):
        return dashboard_service.get_executive_analytics(self.db, program_id, year_min, year_max, modality)

    def get_cohort_heatmap(self, audience: str = "graduate", program_id: int = None, year_min: int = None, year_max: int = None):
        return dashboard_service.get_cohort_heatmap(self.db, audience=audience, program_id=program_id, year_min=year_min, year_max=year_max)

    def get_cohort_insights(self, user_id: int, audience: str = "graduate", program_id: int = None, year_min: int = None, year_max: int = None):
        return dashboard_service.get_cohort_insights(self.db, user_id=user_id, audience=audience, program_id=program_id, year_min=year_min, year_max=year_max)

    def get_executive_insights(self, user_id: int, program_id: int = None, year_min: int = None, year_max: int = None, modality: str = None):
        return dashboard_service.get_executive_insights(self.db, user_id=user_id, program_id=program_id, year_min=year_min, year_max=year_max, modality=modality)

