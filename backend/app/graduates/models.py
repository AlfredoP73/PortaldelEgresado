from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Language(Base):
    __tablename__ = "languages"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Graduate(Base):
    __tablename__ = "graduates"
    __table_args__ = {'extend_existing': True}
    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    graduation_year = Column(Integer, nullable=False)
    phone = Column(String)
    profile_summary = Column(Text, nullable=True)
    cv_url = Column(String(255), nullable=True)
    profile_picture_url = Column(String(255), nullable=True)
    availability_status = Column(String(50), default="open_to_work")
    preferred_modality = Column(String(50), default="Cualquiera")
    availability_notice = Column(String(50), default="Inmediata")
    expected_salary = Column(Integer, nullable=True)
    job_alerts_enabled = Column(Boolean, default=True)
    alert_min_score = Column(Integer, default=75)
    mentor_opt_in = Column(Boolean, default=False)
    directory_visible = Column(Boolean, default=True)

    experiences = relationship("WorkExperience", back_populates="graduate")
    academic_histories = relationship("AcademicHistory", back_populates="graduate")
    certifications = relationship("Certification", back_populates="graduate")
    skills = relationship("GraduateSkill", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", cascade="all, delete-orphan")
    projects = relationship("GraduateProject", back_populates="graduate", cascade="all, delete-orphan")

class SavedSearch(Base):
    __tablename__ = "saved_searches"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    filters_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"
    __table_args__ = {'extend_existing': True}
    graduate_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), primary_key=True)
    headline = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    areas_json = Column(JSON, nullable=True)
    max_mentees = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    mentee_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    goal = Column(String(200), nullable=True)
    status = Column(String(50), default="PENDING") # PENDING, ACCEPTED, REJECTED, FINISHED
    conversation_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    job_offer_id = Column(Integer, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class GraduateSkill(Base):
    __tablename__ = "graduate_skills"
    __table_args__ = {'extend_existing': True}
    graduate_id = Column(Integer, ForeignKey("graduates.user_id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)
    proficiency_level = Column(String)

class GraduateLanguage(Base):
    __tablename__ = "graduate_languages"
    __table_args__ = {'extend_existing': True}
    graduate_id = Column(Integer, ForeignKey("graduates.user_id"), primary_key=True)
    language_id = Column(Integer, ForeignKey("languages.id"), primary_key=True)
    proficiency_level = Column(String)

class WorkExperience(Base):
    __tablename__ = "work_experiences"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id"), nullable=False)
    company_name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    description = Column(Text)
    certificate_url = Column(String(255), nullable=True)

    graduate = relationship("Graduate", back_populates="experiences")

class AcademicHistory(Base):
    __tablename__ = "academic_histories"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id"), nullable=False)
    institution = Column(String, nullable=False)
    degree = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    diploma_url = Column(String(255), nullable=True)

    graduate = relationship("Graduate", back_populates="academic_histories")

class Certification(Base):
    __tablename__ = "certifications"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id"), nullable=False)
    name = Column(String, nullable=False)
    issuing_organization = Column(String, nullable=False)
    issue_date = Column(Date, nullable=False)

    graduate = relationship("Graduate", back_populates="certifications")

class Survey(Base):
    __tablename__ = "surveys"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    questions_json = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False)
    answers_json = Column(JSON, nullable=False)
    submitted_at = Column(DateTime, server_default=func.now())

from app.companies.models import Program

class GraduateProject(Base):
    __tablename__ = "graduate_projects"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    project_url = Column(String(500), nullable=True)
    repository_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    technologies = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    graduate = relationship("Graduate", back_populates="projects")

class GraduateConnection(Base):
    __tablename__ = "graduate_connections"
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    addressee_id = Column(Integer, ForeignKey("graduates.user_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="PENDING", nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
