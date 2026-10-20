from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base
# --- Enums ---
class CompanyStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class JobOfferStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class ApplicationStatus(str, enum.Enum):
    POSTULADO = "POSTULADO"
    EN_EVALUACION = "EN_EVALUACION"
    ENTREVISTADO = "ENTREVISTADO"
    CONTRATADO = "CONTRATADO"
    RECHAZADO = "RECHAZADO"

class SubProcessType(str, enum.Enum):
    prueba_tecnica = "prueba_tecnica"
    prueba_psicotecnica = "prueba_psicotecnica"
    entrevista = "entrevista"
    verificacion_referencias = "verificacion_referencias"
    revision_documentos = "revision_documentos"
    otro = "otro"

class SubProcessStatus(str, enum.Enum):
    pendiente = "pendiente"
    en_progreso = "en_progreso"
    completado = "completado"
    aprobado = "aprobado"
    rechazado = "rechazado"

# --- Tablas Catálogo (3FN) ---
class Sector(Base):
    __tablename__ = "sectors"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    companies = relationship("Company", back_populates="sector")

class City(Base):
    __tablename__ = "cities"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    companies = relationship("Company", back_populates="city")

class Program(Base):
    __tablename__ = "programs"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    faculty_id = Column(Integer, nullable=True)
    job_offers = relationship("JobOffer", back_populates="program")

class JobOfferSkill(Base):
    __tablename__ = "job_offer_skills"
    __table_args__ = {'extend_existing': True}
    job_offer_id = Column(Integer, ForeignKey("job_offers.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(Integer, primary_key=True)
    required_level = Column(String)

# --- Tablas Principales Módulo 2 ---
class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {'extend_existing': True}
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    contact_email = Column(String, nullable=False)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    status = Column(Enum(CompanyStatus, native_enum=False), default=CompanyStatus.PENDING)

    sector = relationship("Sector", back_populates="companies")
    city = relationship("City", back_populates="companies")
    job_offers = relationship("JobOffer", back_populates="company")

class JobOffer(Base):
    __tablename__ = "job_offers"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.user_id"), nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    functions = Column(Text, nullable=False)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    min_experience_years = Column(Integer, default=0)
    modality = Column(String(50), default="Presencial")
    contract_type = Column(String(50), default="Indefinido")
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    closing_date = Column(Date, nullable=False)
    available_slots = Column(Integer, default=1)
    status = Column(Enum(JobOfferStatus, native_enum=False), default=JobOfferStatus.ACTIVE)
    sub_processes_config = Column(JSON, default={})

    company = relationship("Company", back_populates="job_offers")
    program = relationship("Program", back_populates="job_offers")
    applications = relationship("CandidateApplication", back_populates="job_offer")
    skills = relationship("JobOfferSkill", cascade="all, delete-orphan")

class CandidateApplication(Base):
    __tablename__ = "applications"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    job_offer_id = Column(Integer, ForeignKey("job_offers.id"), nullable=False)
    graduate_id = Column(Integer, nullable=False) # ID of graduate from Graduates microservice
    application_date = Column(DateTime(timezone=True), default=func.now())
    status = Column(Enum(ApplicationStatus, native_enum=False), default=ApplicationStatus.POSTULADO)
    rejection_reason = Column(String, nullable=True)
    cover_letter = Column(Text, nullable=True)

    job_offer = relationship("JobOffer", back_populates="applications")
    sub_processes = relationship("ApplicationSubProcess", back_populates="application", cascade="all, delete-orphan")

class ApplicationSubProcess(Base):
    __tablename__ = "application_sub_processes"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(Enum(SubProcessType, native_enum=False), nullable=False)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text)
    etapa_kanban = Column(String, nullable=False)
    fecha_limite = Column(DateTime)
    estado = Column(Enum(SubProcessStatus, native_enum=False), default=SubProcessStatus.pendiente)
    
    es_formulario = Column(Boolean, default=False)
    preguntas_json = Column(JSON, nullable=True) 
    respuestas_json = Column(JSON, nullable=True)
    enlace_adjunto = Column(String, nullable=True)
    archivo_respuesta = Column(String, nullable=True)
    score = Column(Integer, nullable=True)

    application = relationship("CandidateApplication", back_populates="sub_processes")


class EventStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CANCELLED = "CANCELLED"
    FINISHED = "FINISHED"

class EventModality(str, enum.Enum):
    PRESENCIAL = "PRESENCIAL"
    VIRTUAL = "VIRTUAL"
    HIBRIDO = "HIBRIDO"

class Event(Base):
    __tablename__ = "events"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    organizer_user_id = Column(Integer, nullable=False, index=True)
    organizer_role = Column(String(50), default="COMPANY") # "COMPANY" o "ADMIN"
    organizer_name = Column(String(200), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    modality = Column(String(50), default="VIRTUAL") # VIRTUAL, PRESENCIAL, HIBRIDO
    location_or_url = Column(String(500), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=True) # None = ilimitado
    status = Column(String(50), default="PUBLISHED") # DRAFT, PUBLISHED, CANCELLED, FINISHED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")

class EventRegistration(Base):
    __tablename__ = "event_registrations"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    graduate_id = Column(Integer, nullable=False, index=True)
    graduate_name = Column(String(200), nullable=True)
    graduate_email = Column(String(200), nullable=True)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="registrations")

