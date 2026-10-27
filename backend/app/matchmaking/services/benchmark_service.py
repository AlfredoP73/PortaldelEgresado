"""
Servicio de "Radiografía de Competencia en Vivo" (Live Applicant Benchmarking — Módulo 3: Matchmaking).

Calcula la posición relativa del egresado frente a los demás postulantes reales de una misma
vacante en 3 dimensiones (Habilidades, Experiencia, Programa Académico), identifica brechas de
habilidades, palancas de mejora con ganancia estimada de puntos y genera consejos personalizados
con IA (Groq) o respaldo heurístico.
"""

from collections import defaultdict
from datetime import datetime, timezone
from statistics import median
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import ai_client
from app.core.adapters import HttpCompaniesAdapter, HttpGraduatesAdapter
from app.matchmaking.models import Match
from app.matchmaking.services import matching_service

companies_adapter = HttpCompaniesAdapter()
graduates_adapter = HttpGraduatesAdapter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _competitiveness_label(percentile: int) -> str:
    if percentile >= 90:
        return "Top 10%"
    if percentile >= 75:
        return "Top 25%"
    if percentile >= 50:
        return "Mitad superior"
    if percentile >= 25:
        return "Mitad inferior"
    return "Por debajo del promedio"


def _resolve_skill_names(db: Session, skill_ids: List[int]) -> Dict[int, str]:
    if not skill_ids:
        return {}
    try:
        rows = db.execute(
            text("SELECT id, name FROM skills WHERE id = ANY(:ids)"),
            {"ids": list(skill_ids)},
        ).fetchall()
        return {int(r[0]): str(r[1]) for r in rows}
    except Exception:
        return {sid: f"Habilidad #{sid}" for sid in skill_ids}


def get_applicant_benchmark(
    db: Session,
    job_offer_id: int,
    graduate_id: int,
    include_ai: bool = True,
) -> Dict[str, Any]:
    job_offer = matching_service._get_job_offer_data(db, job_offer_id)
    if not job_offer:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    try:
        job_apps = companies_adapter.get_job_applications(job_offer_id)
    except Exception:
        job_apps = []

    my_app = next((a for a in job_apps if a.get("graduate_id") == graduate_id), None)
    applied = my_app is not None
    app_status = my_app.get("status", "NO_POSTULADO") if my_app else "NO_POSTULADO"

    # Si no hay postulaciones o el egresado aún no se ha postulado, igual incluimos su perfil
    # en la simulación en vivo para que pueda ver su radiografía tanto antes como después de postular.
    applicant_ids = list({int(a["graduate_id"]) for a in job_apps if a.get("graduate_id")})
    if graduate_id not in applicant_ids:
        applicant_ids.append(graduate_id)

    matches_by_grad: Dict[int, Match] = {}
    existing_matches = (
        db.query(Match)
        .filter(Match.job_offer_id == job_offer_id, Match.graduate_id.in_(applicant_ids))
        .all()
    )
    for m in existing_matches:
        matches_by_grad[m.graduate_id] = m

    for gid in applicant_ids:
        if gid not in matches_by_grad:
            m = matching_service.calcular_match_individual(db, gid, job_offer_id)
            if m:
                matches_by_grad[gid] = m

    my_match = matches_by_grad.get(graduate_id)
    my_score = round(float(my_match.score), 1) if my_match else 65.0
    my_skills_score = round(float(my_match.skills_score or 60.0), 1) if my_match else 60.0
    my_exp_score = round(float(my_match.experience_score or 65.0), 1) if my_match else 65.0
    my_prog_score = round(float(my_match.program_score or 80.0), 1) if my_match else 80.0

    all_scores = sorted(
        [round(float(m.score), 1) for m in matches_by_grad.values()],
        reverse=True,
    ) or [my_score]

    total_applicants = max(len(job_apps), len(all_scores))
    higher_count = sum(1 for s in all_scores if s > my_score)
    my_rank = higher_count + 1

    if len(all_scores) <= 1:
        percentile = 85 if my_score >= 75 else 65
    else:
        beaten = sum(1 for s in all_scores if s <= my_score)
        percentile = int(round((beaten / len(all_scores)) * 100))
        percentile = max(5, min(99, percentile))

    stats_hidden = len(all_scores) < 3
    avg_score = round(sum(all_scores) / len(all_scores), 1) if not stats_hidden else round(sum(all_scores) / len(all_scores), 1)
    median_score = round(float(median(all_scores)), 1) if all_scores else my_score
    top_score = round(max(all_scores), 1) if all_scores else my_score

    skills_scores = [float(m.skills_score or 0) for m in matches_by_grad.values()] or [my_skills_score]
    exp_scores = [float(m.experience_score or 0) for m in matches_by_grad.values()] or [my_exp_score]
    prog_scores = [float(m.program_score or 0) for m in matches_by_grad.values()] or [my_prog_score]

    breakdown = [
        {
            "key": "skills",
            "label": "Habilidades Técnicas",
            "mine": round(my_skills_score, 1),
            "avg": round(sum(skills_scores) / len(skills_scores), 1),
            "top": round(max(skills_scores), 1),
        },
        {
            "key": "experience",
            "label": "Experiencia Relevante",
            "mine": round(my_exp_score, 1),
            "avg": round(sum(exp_scores) / len(exp_scores), 1),
            "top": round(max(exp_scores), 1),
        },
        {
            "key": "program",
            "label": "Afinidad de Programa",
            "mine": round(my_prog_score, 1),
            "avg": round(sum(prog_scores) / len(prog_scores), 1),
            "top": round(max(prog_scores), 1),
        },
    ]

    stage_counts: Dict[str, int] = defaultdict(int)
    for a in job_apps:
        st = a.get("status") or "POSTULADO"
        stage_counts[st] += 1
    if not stage_counts:
        stage_counts[app_status if applied else "POSTULADO"] = 1

    stage_order = ["POSTULADO", "EN_EVALUACION", "ENTREVISTADO", "CONTRATADO", "RECHAZADO"]
    stage_distribution = [
        {"status": st, "count": stage_counts.get(st, 0)}
        for st in stage_order
        if stage_counts.get(st, 0) > 0
    ]

    # Brechas de habilidades (my_gaps)
    grad_data = matching_service._get_graduate_data(db, graduate_id) or {}
    my_skill_map: Dict[int, str] = {int(k): str(v) for k, v in (grad_data.get("skills") or {}).items()}
    req_skill_map: Dict[int, str] = {int(k): str(v) for k, v in (job_offer.get("required_skills") or {}).items()}

    missing_ids = [sid for sid in req_skill_map.keys() if sid not in my_skill_map]
    skill_names_map = _resolve_skill_names(db, list(req_skill_map.keys()))

    my_gaps = [
        {
            "skill": skill_names_map.get(sid, f"Habilidad #{sid}"),
            "required_level": req_skill_map.get(sid) or "Intermedio",
        }
        for sid in missing_ids
    ]

    strengths = []
    if my_prog_score >= 80:
        strengths.append("Tu programa académico coincide directamente con el perfil solicitado por la empresa.")
    if my_skills_score >= 75:
        strengths.append("Dominas la mayoría de las habilidades clave exigidas para el cargo.")
    if my_exp_score >= 75:
        strengths.append("Tu trayectoria práctica iguala o supera los años de experiencia requeridos.")
    if not strengths:
        strengths.append("Tu perfil cuenta con bases transferibles para competir en esta convocatoria.")

    improvement_levers = []
    for g in my_gaps[:3]:
        gain = round(40.0 / max(1, len(req_skill_map)), 1)
        improvement_levers.append({
            "title": f"Incorporar {g['skill']} ({g['required_level']})",
            "detail": f"La vacante pondera esta habilidad; registrarla y demostrarla en un proyecto aumentaría tu afinidad.",
            "estimated_gain": min(18.0, max(4.5, gain)),
        })

    if my_exp_score < 85:
        improvement_levers.append({
            "title": "Detallar logros medibles en tu experiencia laboral",
            "detail": "Documentar prácticas profesionales, monitorías o proyectos aplicados eleva tu puntaje de experiencia.",
            "estimated_gain": 6.5,
        })

    job_title = job_offer.get("title") or f"Vacante #{job_offer_id}"
    ai_tips_obj = None
    if include_ai:
        heuristic_tips = {
            "source": "heuristic",
            "model": None,
            "summary": (
                f"Te ubicas en la posición #{my_rank} de {total_applicants} ({_competitiveness_label(percentile)}) "
                f"con {my_score}% de afinidad frente a un promedio de {avg_score}%."
            ),
            "tips": [
                (
                    f"Prioriza adquirir o acreditar {', '.join(g['skill'] for g in my_gaps[:2])} para cerrar la brecha frente al top de postulantes."
                    if my_gaps
                    else "Destaca tus proyectos prácticos y certificaciones en tu carta de presentación para diferenciarte del percentil superior."
                ),
                "Personaliza tu resumen profesional incluyendo las palabras clave exactas del título y funciones de esta oferta.",
                "Prepara ejemplos STAR sobre tus experiencias más recientes para avanzar de POSTULADO a ENTREVISTADO.",
            ],
        }

        if ai_client.is_enabled():
            cache_k = ai_client.cache_key("benchmark_ai_v1", job_offer_id, graduate_id, my_score, total_applicants)
            cached = ai_client.cache_get(cache_k)
            if cached:
                ai_tips_obj = cached
            else:
                try:
                    ai_client.check_rate_limit(f"bench_ai_{graduate_id}", max_calls=20, window_seconds=600)
                    sys_p = (
                        "Eres un estratega de empleabilidad para egresados de la Universidad Popular del Cesar. "
                        "Analizas el posicionamiento competitivo anónimo del egresado frente a otros postulantes a una vacante. "
                        "Devuelve un JSON con: summary (string de 2 oraciones motivadoras y objetivas) y tips (lista de 3 acciones tácticas concretas)."
                    )
                    usr_p = (
                        f"Vacante: {job_title}\n"
                        f"Posición del egresado: #{my_rank} de {total_applicants} (Percentil {percentile}, {_competitiveness_label(percentile)})\n"
                        f"Puntaje propio: {my_score}% | Promedio: {avg_score}% | Top: {top_score}%\n"
                        f"Desglose: {breakdown}\n"
                        f"Habilidades faltantes: {my_gaps}"
                    )
                    llm = ai_client.chat_json(sys_p, usr_p, fast=True, temperature=0.35, max_tokens=600)
                    ai_tips_obj = {
                        "source": "groq",
                        "model": ai_client.model_name(True),
                        "summary": str(llm.get("summary") or heuristic_tips["summary"]),
                        "tips": llm.get("tips") if isinstance(llm.get("tips"), list) and llm.get("tips") else heuristic_tips["tips"],
                    }
                    ai_client.cache_set(cache_k, ai_tips_obj, ttl_seconds=600)
                except Exception:
                    ai_tips_obj = heuristic_tips
        else:
            ai_tips_obj = heuristic_tips

    return {
        "job_offer_id": job_offer_id,
        "job_title": job_title,
        "applied": applied,
        "application_status": app_status,
        "total_applicants": total_applicants,
        "my_rank": my_rank,
        "percentile": percentile,
        "competitiveness": _competitiveness_label(percentile),
        "my_score": my_score,
        "avg_score": avg_score,
        "median_score": median_score,
        "top_score": top_score,
        "stats_hidden": stats_hidden,
        "breakdown": breakdown,
        "stage_distribution": stage_distribution,
        "my_gaps": my_gaps,
        "strengths": strengths,
        "improvement_levers": improvement_levers[:3],
        "ai_tips": ai_tips_obj,
        "updated_at": _now_iso(),
    }

