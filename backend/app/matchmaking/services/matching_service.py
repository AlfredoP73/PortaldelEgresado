"""
Motor de Compatibilidad (Matchmaking).

Calcula un score de 0 a 100 entre un egresado y una vacante, combinando
tres criterios ponderados: programa académico, habilidades y experiencia.
Los pesos se leen de matchmaking_weights (configurables desde el CRUD
de criterios, Módulo 3.3).
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.matchmaking.models import Match, MatchNotification
from app.matchmaking.services.criteria_service import get_weights
from app.matchmaking.controllers.ws_controller import manager
import asyncio

# Umbral de compatibilidad a partir del cual se genera una notificación (Módulo 3.2)
UMBRAL_NOTIFICACION = Decimal("75.00")


# ── Lectura de datos de otros dominios (API Composition) ──
from app.core.adapters import HttpGraduatesAdapter, HttpCompaniesAdapter, HttpAuthAdapter

graduates_adapter = HttpGraduatesAdapter()
companies_adapter = HttpCompaniesAdapter()
auth_adapter = HttpAuthAdapter()

def _get_graduate_data(db: Session, graduate_id: int) -> Optional[dict]:
    try:
        return graduates_adapter.get_matchmaking_graduate(graduate_id)
    except Exception:
        return None

def _get_survey_context(db: Session, graduate_id: int) -> dict:
    # Included in _get_graduate_data now
    return {"laborando": None, "sector": None, "relacion_programa": None}

def _get_job_offer_data(db: Session, job_offer_id: int) -> Optional[dict]:
    try:
        return companies_adapter.get_matchmaking_job(job_offer_id)
    except Exception:
        return None


# ── Algoritmo puro (fácil de testear unitariamente) ──────────────────────────
from app.matchmaking.services.score_builder import MatchScoreBuilder

def calcular_afinidad(graduate: dict, job_offer: dict, weights: dict) -> dict:
    builder = MatchScoreBuilder(graduate, job_offer, weights)
    builder.build_program_score() \
           .build_skills_score() \
           .build_experience_score() \
           .build_survey_bonus() \
           .build_final_score()
           
    return builder.get_result()


# ── Persistencia + notificaciones ────────────────────────────────────────────
def _upsert_match(db: Session, graduate_id: int, job_offer_id: int, result: dict, graduate: Optional[dict] = None, job_offer: Optional[dict] = None) -> Match:
    existing = db.query(Match).filter_by(graduate_id=graduate_id, job_offer_id=job_offer_id).first()
    if existing:
        existing.score = result["score"]
        existing.program_score = result["program_score"]
        existing.skills_score = result["skills_score"]
        existing.experience_score = result["experience_score"]
        match = existing
    else:
        match = Match(
            graduate_id=graduate_id,
            job_offer_id=job_offer_id,
            score=result["score"],
            program_score=result["program_score"],
            skills_score=result["skills_score"],
            experience_score=result["experience_score"],
        )
        db.add(match)
    db.commit()
    db.refresh(match)

    alerts_enabled = graduate.get("job_alerts_enabled", True) if graduate else True
    min_threshold = Decimal(str(graduate.get("alert_min_score", 75))) if graduate else UMBRAL_NOTIFICACION

    if alerts_enabled and result["score"] >= min_threshold:
        ya_notificado = (
            db.query(MatchNotification)
            .filter_by(graduate_id=graduate_id, job_offer_id=job_offer_id)
            .first()
        )
        if not ya_notificado:
            db.add(
                MatchNotification(
                    graduate_id=graduate_id,
                    job_offer_id=job_offer_id,
                    score=result["score"],
                )
            )
            db.commit()
            
            # Enviar alerta transversal a Auth (notificación web + push FCM)
            try:
                job_title = (job_offer.get("title") if job_offer else None) or "Nueva Vacante"
                company_name = (job_offer.get("company_name") if job_offer else None) or "Empresa Aliada"
                auth_adapter.send_notification(
                    user_id=graduate_id,
                    title=f"¡{int(result['score'])}% de afinidad con nueva vacante!",
                    message=f"La oferta '{job_title}' en {company_name} coincide con tu perfil.",
                    type="JOB_ALERT",
                    payload={"job_offer_id": job_offer_id, "score": float(result["score"])},
                    dedup_key=f"job_alert_{graduate_id}_{job_offer_id}"
                )
            except Exception as e:
                print(f"Error sending auth notification: {e}")

            # Notificar en tiempo real por WebSockets
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(manager.send_personal_message({"type": "NEW_MATCH", "job_offer_id": job_offer_id, "score": float(result["score"])}, graduate_id))
                else:
                    asyncio.run(manager.send_personal_message({"type": "NEW_MATCH", "job_offer_id": job_offer_id, "score": float(result["score"])}, graduate_id))
            except Exception as e:
                print(f"Error sending ws message: {e}")

    return match


# ── Funciones públicas usadas por los controllers ────────────────────────────
def calcular_match_individual(db: Session, graduate_id: int, job_offer_id: int) -> Optional[Match]:
    graduate = _get_graduate_data(db, graduate_id)
    job_offer = _get_job_offer_data(db, job_offer_id)
    if not graduate or not job_offer:
        return None

    weights = get_weights(db)
    result = calcular_afinidad(graduate, job_offer, weights)
    return _upsert_match(db, graduate_id, job_offer_id, result, graduate=graduate, job_offer=job_offer)


def recalcular_por_egresado(db: Session, graduate_id: int) -> list[Match]:
    """Se dispara cuando el egresado actualiza su perfil/hoja de vida."""
    try:
        job_offer_ids = companies_adapter.get_matchmaking_job_ids()
    except Exception:
        job_offer_ids = []
    resultados = []
    for jid in job_offer_ids:
        m = calcular_match_individual(db, graduate_id, jid)
        if m:
            resultados.append(m)
    return resultados


def recalcular_por_vacante(db: Session, job_offer_id: int) -> list[Match]:
    """Se dispara cuando la empresa publica o edita una vacante."""
    try:
        graduate_ids = graduates_adapter.get_matchmaking_graduate_ids()
    except Exception:
        graduate_ids = []
    resultados = []
    for gid in graduate_ids:
        m = calcular_match_individual(db, gid, job_offer_id)
        if m:
            resultados.append(m)

    # Coincidencia con Búsquedas Guardadas
    try:
        job_offer = _get_job_offer_data(db, job_offer_id) or {}
        job_title = (job_offer.get("title") or "").lower()
        job_desc = (job_offer.get("description") or "").lower()
        job_modality = (job_offer.get("modality") or "").lower()
        company_name = job_offer.get("company_name", "Empresa Aliada")
        
        saved_searches = graduates_adapter.get_all_saved_searches()
        for s in saved_searches:
            filters = s.get("filters_json") or {}
            q = (filters.get("q") or "").strip().lower()
            modality = (filters.get("modality") or "").strip().lower()
            
            match_q = True if not q else (q in job_title or q in job_desc)
            match_mod = True if not modality or modality == "cualquiera" else (modality in job_modality)
            
            if match_q and match_mod and (q or (modality and modality != "cualquiera")):
                try:
                    auth_adapter.send_notification(
                        user_id=s["graduate_id"],
                        title=f"Coincidencia con tu búsqueda: '{s['name']}'",
                        message=f"La oferta '{job_offer.get('title', 'Vacante')}' en {company_name} coincide con tu búsqueda guardada.",
                        type="JOB_ALERT",
                        payload={"job_offer_id": job_offer_id, "search_id": s["id"]},
                        dedup_key=f"saved_search_{s['id']}_{job_offer_id}"
                    )
                except Exception as e:
                    print(f"Error notifying saved search: {e}")
    except Exception as e:
        print(f"Error checking saved searches: {e}")

    return resultados


def obtener_vacantes_recomendadas(db: Session, graduate_id: int, limit: int = 10) -> list[Match]:
    existing_count = db.query(Match).filter(Match.graduate_id == graduate_id).count()
    if existing_count == 0:
        try:
            recalcular_por_egresado(db, graduate_id)
        except Exception as e:
            print(f"Warning auto-recalculando matches para egresado {graduate_id}: {e}")

    return (
        db.query(Match)
        .filter(Match.graduate_id == graduate_id)
        .order_by(Match.score.desc())
        .limit(limit)
        .all()
    )


def obtener_candidatos_recomendados(db: Session, job_offer_id: int, limit: int = 10) -> list[Match]:
    existing_count = db.query(Match).filter(Match.job_offer_id == job_offer_id).count()
    if existing_count == 0:
        try:
            recalcular_por_vacante(db, job_offer_id)
        except Exception as e:
            print(f"Warning auto-recalculando matches para vacante {job_offer_id}: {e}")

    return (
        db.query(Match)
        .filter(Match.job_offer_id == job_offer_id)
        .order_by(Match.score.desc())
        .limit(limit)
        .all()
    )
