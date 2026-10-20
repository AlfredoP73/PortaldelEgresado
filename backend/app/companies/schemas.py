from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from .models import CompanyStatus, JobOfferStatus, ApplicationStatus, SubProcessType, SubProcessStatus

# --- Catalogs ---
class SectorBase(BaseModel):
    name: str

class SectorCreate(SectorBase):
    pass

class SectorUpdate(SectorBase):
    pass

class Sector(SectorBase):
    id: int
    class Config:
        from_attributes = True

class CityBase(BaseModel):
    name: str

class CityCreate(CityBase):
    pass

class CityUpdate(CityBase):
    pass

class City(CityBase):
    id: int
    class Config:
        from_attributes = True

class ProgramBase(BaseModel):
    name: str

class ProgramCreate(ProgramBase):
    pass

class ProgramUpdate(ProgramBase):
    pass

class Program(ProgramBase):
    id: int
    class Config:
        from_attributes = True

# --- Company ---
class CompanyBase(BaseModel):
    user_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    contact_email: str
    sector_id: int
    city_id: int

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdateStatus(BaseModel):
    status: CompanyStatus

class Company(CompanyBase):
    user_id: int
    status: CompanyStatus
    sector: Sector
    city: City

    class Config:
        from_attributes = True

# --- Job Offer Skills ---
class JobOfferSkillBase(BaseModel):
    skill_id: int
    required_level: str = "Intermedio"

class JobOfferSkillCreate(JobOfferSkillBase):
    pass

class JobOfferSkill(JobOfferSkillBase):
    job_offer_id: int
    class Config:
        from_attributes = True

# --- Job Offer ---
class JobOfferBase(BaseModel):
    company_id: int
    title: str
    description: str
    requirements: str
    functions: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    min_experience_years: int = 0
    modality: str = "Presencial"
    contract_type: str = "Indefinido"
    program_id: int
    closing_date: date
    available_slots: int = 1

class JobOfferCreate(JobOfferBase):
    required_skills: List[JobOfferSkillCreate] = []

class JobOffer(JobOfferBase):
    id: int
    status: JobOfferStatus
    company: Company
    program: Program
    skills: List[JobOfferSkill] = []

    class Config:
        from_attributes = True

# --- Application ---
class ApplicationBase(BaseModel):
    job_offer_id: int
    graduate_id: int
    application_date: datetime
    cover_letter: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdateStatus(BaseModel):
    status: ApplicationStatus
    rejection_reason: Optional[str] = None

class BulkApplicationUpdate(BaseModel):
    application_ids: List[int]
    status: ApplicationStatus
    rejection_reason: Optional[str] = None

class Application(ApplicationBase):
    id: int
    status: ApplicationStatus
    rejection_reason: Optional[str] = None
    cover_letter: Optional[str] = None
    
    class Config:
        from_attributes = True

class GraduateBasicInfo(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    program_id: int
    graduation_year: int
    
    class Config:
        from_attributes = True

class SubProcessBase(BaseModel):
    tipo: SubProcessType
    nombre: str
    descripcion: Optional[str] = None
    etapa_kanban: str
    fecha_limite: Optional[datetime] = None
    es_formulario: bool = False
    preguntas_json: Optional[Any] = None
    enlace_adjunto: Optional[str] = None
    archivo_respuesta: Optional[str] = None

class SubProcessCreate(SubProcessBase):
    application_id: int

class SubProcessUpdate(BaseModel):
    estado: Optional[SubProcessStatus] = None
    respuestas_json: Optional[Any] = None
    score: Optional[int] = None

class ApplicationSubProcessSchema(SubProcessBase):
    id: int
    application_id: int
    estado: SubProcessStatus
    respuestas_json: Optional[Any] = None
    archivo_respuesta: Optional[str] = None
    score: Optional[int] = None
    
    class Config:
        from_attributes = True

class ApplicationWithCandidate(Application):
    graduate: Optional[GraduateBasicInfo] = None
    sub_processes: List[ApplicationSubProcessSchema] = []
    match_score: Optional[float] = None
    
    class Config:
        from_attributes = True

class GraduateWithContact(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    program_id: int
    graduation_year: int
    phone: Optional[str] = None
    email: Optional[str] = None
    cv_url: Optional[str] = None
    profile_summary: Optional[str] = None
    experiences: List[Any] = []
    academic_histories: List[Any] = []
    certifications: List[Any] = []
    
    class Config:
        from_attributes = True


class EventBase(BaseModel):
    title: str
    description: str
    modality: Optional[str] = "VIRTUAL" # VIRTUAL, PRESENCIAL, HIBRIDO
    location_or_url: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    capacity: Optional[int] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    modality: Optional[str] = None
    location_or_url: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = None
    status: Optional[str] = None

class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    graduate_id: int
    graduate_name: Optional[str] = None
    graduate_email: Optional[str] = None
    registered_at: datetime
    class Config:
        from_attributes = True

class EventResponse(EventBase):
    id: int
    organizer_user_id: int
    organizer_role: str
    organizer_name: Optional[str] = None
    status: str
    created_at: datetime
    registered_count: int = 0
    is_registered: Optional[bool] = False
    class Config:
        from_attributes = True

