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
    
    # Extra fields sent by mobile app that we can safely ignore
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    document_type: Optional[str] = None

class GraduateSkillsUpdate(BaseModel):
    skills: List[GraduateSkillCreate]

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
    name: str
    class Config:
        from_attributes = True

class CityMinimal(BaseModel):
    name: str
    class Config:
        from_attributes = True

class CompanyFull(BaseModel):
    name: str
    sector: Optional[SectorMinimal] = None
    city: Optional[CityMinimal] = None
    class Config:
        from_attributes = True

class JobOffer(BaseModel):
    id: int
    title: str
    description: str
    requirements: str
    functions: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    program_id: int
    closing_date: date
    status: str
    company: CompanyFull
    
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

    class Config:
        from_attributes = True

class ApplicationCreate(BaseModel):
    job_offer_id: int

class Application(BaseModel):
    id: int
    job_offer_id: int
    graduate_id: int
    application_date: datetime
    status: str
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
