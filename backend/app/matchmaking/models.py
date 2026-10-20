"""
Modelos SQLAlchemy del microservicio Matchmaking.

NOTA: Este microservicio es dueño de las tablas: matchmaking_weights,
job_offer_skills, matches y match_notifications.

Las tablas de otros dominios (graduates, job_offers, graduate_skills,
work_experiences, etc.) NO se modelan aquí como ORM para no duplicar
la fuente de verdad entre microservicios; se leen con SQL crudo desde
matching_service.py (misma base de datos compartida vía docker-compose).
"""

from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class MatchmakingWeight(Base):
    """Pesos configurables del algoritmo (Módulo 3.3)."""

    __tablename__ = "matchmaking_weights"

    id = Column(Integer, primary_key=True, index=True)
    program_weight = Column(Numeric(4, 2), nullable=False, default=0.40)
    skills_weight = Column(Numeric(4, 2), nullable=False, default=0.40)
    experience_weight = Column(Numeric(4, 2), nullable=False, default=0.20)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class JobOfferSkill(Base):
    """Habilidades requeridas por una vacante (espejo de graduate_skills)."""

    __tablename__ = "job_offer_skills"
    __table_args__ = {'extend_existing': True}

    # Sin ForeignKey(): la restricción ya existe en la BD (migration_matchmaking.sql).
    # Declararla aquí rompería el flush porque job_offers/skills no están en este metadata.
    job_offer_id = Column(Integer, primary_key=True)
    skill_id = Column(Integer, primary_key=True)
    required_level = Column(String(50), nullable=True)


class Match(Base):
    """Resultado cacheado del cálculo de afinidad egresado <-> vacante."""

    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, nullable=False)   # FK a graduates.user_id vive en la BD
    job_offer_id = Column(Integer, nullable=False)  # FK a job_offers.id vive en la BD

    score = Column(Numeric(5, 2), nullable=False)
    program_score = Column(Numeric(5, 2))
    skills_score = Column(Numeric(5, 2))
    experience_score = Column(Numeric(5, 2))

    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("graduate_id", "job_offer_id", name="uq_graduate_job_offer"),
    )


class MatchNotification(Base):
    """Alerta enviada al egresado cuando una vacante supera el umbral de compatibilidad."""

    __tablename__ = "match_notifications"

    id = Column(Integer, primary_key=True, index=True)
    graduate_id = Column(Integer, nullable=False)   # FK en la BD
    job_offer_id = Column(Integer, nullable=False)  # FK en la BD
    score = Column(Numeric(5, 2), nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())