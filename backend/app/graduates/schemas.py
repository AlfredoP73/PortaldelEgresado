from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class WorkExperienceBase(BaseModel):
    company_name: str
    position: str
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None

class WorkExperienceCreate(WorkExperienceBase):
    pass

class WorkExperience(WorkExperienceBase):
    id: int
    graduate_id: int
    certificate_url: Optional[str] = None

    class Config:
        from_attributes = True

class AcademicHistoryBase(BaseModel):
    institution: str
    degree: str
    start_date: date
    end_date: Optional[date] = None

class AcademicHistoryCreate(AcademicHistoryBase):
    pass

class AcademicHistory(AcademicHistoryBase):
    id: int
    graduate_id: int
    diploma_url: Optional[str] = None

    class Config:
        from_attributes = True

class CertificationBase(BaseModel):
    name: str
    issuing_organization: str
    issue_date: date

class CertificationCreate(CertificationBase):
    pass

class Certification(CertificationBase):
    id: int
    class Config:
        from_attributes = True

class SkillBase(BaseModel):
    name: str

class Skill(SkillBase):
    id: int
    class Config:
        from_attributes = True

class GraduateSkillBase(BaseModel):
    skill_id: int
    proficiency_level: str = "Intermedio"

class GraduateSkillCreate(GraduateSkillBase):
    pass

class GraduateSkill(GraduateSkillBase):
    graduate_id: int
    class Config:
        from_attributes = True

class GraduateBase(BaseModel):
    first_name: str
    last_name: str
    program_id: int
    graduation_year: int
    phone: Optional[str] = None
    cv_url: Optional[str] = None
    profile_picture_url: Optional[str] = None
    profile_summary: Optional[str] = None
    availability_status: Optional[str] = "open_to_work"
    preferred_modality: Optional[str] = "Cualquiera"
    availability_notice: Optional[str] = "Inmediata"
    expected_salary: Optional[int] = None
    job_alerts_enabled: Optional[bool] = True
    alert_min_score: Optional[int] = 75
    mentor_opt_in: Optional[bool] = False
    directory_visible: Optional[bool] = True

class GraduateCreate(GraduateBase):
    user_id: Optional[int] = None

class GraduateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    program_id: Optional[int] = None
    graduation_year: Optional[int] = None
    phone: Optional[str] = None
    cv_url: Optional[str] = None
    profile_picture_url: Optional[str] = None
    profile_summary: Optional[str] = None
    availability_status: Optional[str] = None
    preferred_modality: Optional[str] = None
    availability_notice: Optional[str] = None
    expected_salary: Optional[int] = None
    job_alerts_enabled: Optional[bool] = None
    alert_min_score: Optional[int] = None
    mentor_opt_in: Optional[bool] = None
    directory_visible: Optional[bool] = None
    
    # Extra fields sent by mobile app that we can safely ignore
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    document_type: Optional[str] = None

class SavedSearchBase(BaseModel):
    name: str
    filters_json: Dict[str, Any]

class SavedSearchCreate(SavedSearchBase):
    pass

class SavedSearchResponse(SavedSearchBase):
    id: int
    graduate_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class AlertSettingsUpdate(BaseModel):
    job_alerts_enabled: Optional[bool] = None
    alert_min_score: Optional[int] = None

class AlertSettingsResponse(BaseModel):
    job_alerts_enabled: bool
    alert_min_score: int

class MentorProfileBase(BaseModel):
    headline: Optional[str] = None
    bio: Optional[str] = None
    areas_json: Optional[List[str]] = []
    max_mentees: Optional[int] = 3
    is_active: Optional[bool] = True

class MentorProfileCreate(MentorProfileBase):
    pass

class MentorProfileResponse(MentorProfileBase):
    graduate_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class MentorshipRequestCreate(BaseModel):
    mentor_id: int
    message: str
    goal: Optional[str] = None

class MentorshipRequestResponse(BaseModel):
    id: int
    mentee_id: int
    mentor_id: int
    message: str
    goal: Optional[str] = None
    status: str
    conversation_id: Optional[int] = None
    created_at: datetime
    mentee_name: Optional[str] = None
    mentor_name: Optional[str] = None
    class Config:
        from_attributes = True

class MentorshipRequestStatusUpdate(BaseModel):
    status: str # ACCEPTED, REJECTED, FINISHED

class DirectoryGraduateResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    program_id: int
    program_name: Optional[str] = None
    graduation_year: int
    profile_summary: Optional[str] = None
    profile_picture_url: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    mentor_opt_in: bool = False
    mentor_profile: Optional[MentorProfileResponse] = None
    skills: List[str] = []

class GraduateSkillsUpdate(BaseModel):
    skills: List[GraduateSkillCreate]

class QuickAddSkillRequest(BaseModel):
    skill_id: Optional[int] = None
    skill_name: Optional[str] = None
    proficiency_level: str = "Intermedio"

class Graduate(GraduateBase):
    user_id: int
    experiences: List[WorkExperience] = []
    academic_histories: List[AcademicHistory] = []
    certifications: List[Certification] = []
    skills: List[GraduateSkill] = []

    class Config:
        from_attributes = True

# For Job Board (Read-Only Views)
class SectorMinimal(BaseModel):
    id: Optional[int] = None
    name: str
    class Config:
        from_attributes = True

class CityMinimal(BaseModel):
    id: Optional[int] = None
    name: str
    class Config:
        from_attributes = True

class CompanyFull(BaseModel):
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    sector: Optional[SectorMinimal] = None
    city: Optional[CityMinimal] = None
    class Config:
        from_attributes = True

class JobOfferSkillOut(BaseModel):
    skill_id: int
    required_level: Optional[str] = "Intermedio"
    class Config:
        from_attributes = True

class JobOffer(BaseModel):
    id: int
    company_id: Optional[int] = None
    title: str
    description: str
    requirements: str
    functions: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    min_experience_years: Optional[int] = 0
    available_slots: Optional[int] = 1
    modality: Optional[str] = "Presencial"
    contract_type: Optional[str] = "Indefinido"
    program_id: int
    closing_date: date
    status: str
    company: CompanyFull
    skills: List[JobOfferSkillOut] = []
    
    class Config:
        from_attributes = True

class ApplicationSubProcessSchema(BaseModel):
    id: int
    application_id: int
    tipo: str
    nombre: str
    descripcion: Optional[str] = None
    etapa_kanban: str
    fecha_limite: Optional[datetime] = None
    estado: str
    es_formulario: bool = False
    preguntas_json: Optional[Any] = None
    respuestas_json: Optional[Any] = None
    enlace_adjunto: Optional[str] = None
    archivo_respuesta: Optional[str] = None
    score: Optional[int] = None

    class Config:
        from_attributes = True

class ApplicationCreate(BaseModel):
    job_offer_id: int
    cover_letter: Optional[str] = None

class Application(BaseModel):
    id: int
    job_offer_id: int
    graduate_id: int
    application_date: datetime
    status: str
    rejection_reason: Optional[str] = None
    cover_letter: Optional[str] = None
    job_offer: Optional[JobOffer] = None
    sub_processes: List[ApplicationSubProcessSchema] = []

    class Config:
        from_attributes = True

class AdminGraduateCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    program_id: int
    graduation_year: int
    phone: Optional[str] = None

class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    questions_json: list
    is_active: bool = True

class Survey(SurveyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SurveyResponseCreate(BaseModel):
    survey_id: int
    answers_json: dict

class SurveyResponse(SurveyResponseCreate):
    id: int
    graduate_id: int
    submitted_at: datetime

    class Config:
        from_attributes = True


# ─── Proyectos y Portafolio ──────────────────────────────────────────────────
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_url: Optional[str] = None
    repository_url: Optional[str] = None
    image_url: Optional[str] = None
    technologies: Optional[str] = None
    resource_type: Optional[str] = None   # github, behance, youtube, drive, web, paper, repo, other
    resource_url: Optional[str] = None    # URL principal del recurso

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_url: Optional[str] = None
    repository_url: Optional[str] = None
    image_url: Optional[str] = None
    technologies: Optional[str] = None
    resource_type: Optional[str] = None
    resource_url: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    graduate_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# â”€â”€ Conexiones y Solicitudes de Amistad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class ConnectionRequestCreate(BaseModel):
    target_user_id: int
    message: Optional[str] = None

class ConnectionAction(BaseModel):
    action: str  # "ACCEPT" or "REJECT"

class ConnectionResponse(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    message: Optional[str] = None
    created_at: Optional[datetime] = None
    peer_id: Optional[int] = None
    peer_name: Optional[str] = None
    peer_program: Optional[str] = None
    peer_picture_url: Optional[str] = None

    class Config:
        from_attributes = True

class ConnectionStatusResponse(BaseModel):
    status: str  # "NONE", "PENDING", "ACCEPTED", "REJECTED", "SELF"
    is_requester: bool = False
    connection_id: Optional[int] = None


# â”€â”€ Perfil PÃºblico Completo de Egresado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class GraduatePublicProfileResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    program_id: int
    program_name: Optional[str] = None
    graduation_year: int
    phone: Optional[str] = None
    profile_summary: Optional[str] = None
    profile_picture_url: Optional[str] = None
    cv_url: Optional[str] = None
    availability_status: Optional[str] = None
    preferred_modality: Optional[str] = None
    experiences: List[WorkExperience] = []
    academic_histories: List[AcademicHistory] = []
    certifications: List[Certification] = []
    skills: List[str] = []
    projects: List[ProjectResponse] = []
    connection_status: Optional[str] = "NONE"
    connection_id: Optional[int] = None
