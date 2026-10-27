"""
Servicio de Reclutamiento a Ciegas (Blind Hiring / Anti-Sesgo) y Dictamen IA Ciego (Módulo 2: Companies).

Reglas clave:
1. Alias determinístico por (job_offer_id, graduate_id): ej. `Candidato UPC #A482`.
2. Regla de revelado server-side: la identidad real SOLO se incluye cuando el estado
   de la postulación está en `{ENTREVISTADO, CONTRATADO}`.
3. En modo ciego NUNCA salen del servidor: nombres, apellidos, correo, teléfono,
   foto de perfil, URL de hoja de vida ni nombres de empresas/instituciones.
4. El sintetizador IA (`ai-summary`) recibe exclusivamente el perfil anonimizado y
   la oferta laboral para emitir un veredicto objetivo de ajuste (`fit_label`, `fit_score`,
   `executive_summary`, `strengths`, `gaps`, `evidence`, `interview_questions`, `bias_guard`).
"""

import hashlib
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.companies import models
from app.core import ai_client
from app.core.adapters import HttpGraduatesAdapter

graduates_adapter = HttpGraduatesAdapter()

REVEALED_STATUSES = {
    models.ApplicationStatus.ENTREVISTADO.value,
    models.ApplicationStatus.CONTRATADO.value,
    "ENTREVISTADO",
    "CONTRATADO",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_candidate_alias(job_offer_id: int, graduate_id: int) -> str:
    digest = hashlib.sha256(f"upc-blind:{job_offer_id}:{graduate_id}".encode("utf-8")).hexdigest().upper()
    letter = chr(65 + (int(digest[:2], 16) % 26))
    digits = f"{int(digest[2:6], 16) % 1000:03d}"
    return f"Candidato UPC #{letter}{digits}"


def _status_str(status_val: Any) -> str:
    return status_val.value if hasattr(status_val, "value") else str(status_val)


def _calc_experience_years(experiences: List[Dict[str, Any]]) -> float:
    total_days = 0
    for exp in experiences or []:
        start_raw = exp.get("start_date")
        end_raw = exp.get("end_date")
        try:
            start_d = date.fromisoformat(str(start_raw)[:10]) if start_raw else None
            end_d = date.fromisoformat(str(end_raw)[:10]) if end_raw else date.today()
            if start_d and end_d >= start_d:
                total_days += (end_d - start_d).days
        except Exception:
            total_days += 180
    return round(total_days / 365.25, 1)


def _extract_skill_names(grad_dict: Dict[str, Any]) -> List[Dict[str, str]]:
    raw_skills = grad_dict.get("skills") or []
    result = []
    for sk in raw_skills:
        if isinstance(sk, dict):
            name = sk.get("skill_name") or sk.get("name") or f"Habilidad #{sk.get('skill_id', '')}"
            level = sk.get("proficiency_level") or sk.get("level") or "Intermedio"
            result.append({"name": str(name), "level": str(level)})
        elif isinstance(sk, str):
            result.append({"name": sk, "level": "Intermedio"})
    return result


def get_blind_applications_by_job(job_offer_id: int, current_user: dict, db: Session) -> List[Dict[str, Any]]:
    job = db.query(models.JobOffer).filter(models.JobOffer.id == job_offer_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    if current_user["role_id"] != 1 and job.company_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta vacante")

    applications = (
        db.query(models.CandidateApplication)
        .options(joinedload(models.CandidateApplication.sub_processes))
        .filter(models.CandidateApplication.job_offer_id == job_offer_id)
        .all()
    )

    try:
        all_grads_list = graduates_adapter.get_all_graduates()
        all_grads = {g["user_id"]: g for g in all_grads_list}
    except Exception:
        all_grads = {}

    programs_map: Dict[int, str] = {}
    try:
        for p in db.query(models.Program).all():
            programs_map[p.id] = p.name
    except Exception:
        pass

    match_scores: Dict[int, float] = {}
    try:
        from app.matchmaking.models import Match
        matches = db.query(Match).filter(Match.job_offer_id == job_offer_id).all()
        match_scores = {m.graduate_id: float(m.score) for m in matches}
    except Exception:
        match_scores = {}

    results: List[Dict[str, Any]] = []
    for app in applications:
        st = _status_str(app.status)
        revealed = st in REVEALED_STATUSES
        alias = make_candidate_alias(job_offer_id, app.graduate_id)
        grad = all_grads.get(app.graduate_id) or {}

        program_id = grad.get("program_id") or job.program_id or 1
        grad_year = grad.get("graduation_year") or 2024
        prog_name = programs_map.get(program_id, f"Programa {program_id}")
        exp_years = _calc_experience_years(grad.get("experiences") or [])
        skills_objs = _extract_skill_names(grad)
        top_skills = [s["name"] for s in skills_objs[:5]]

        headline = f"{prog_name} · Cohorte {grad_year} · {exp_years} años exp."
        sub_procs = [
            {k: v for k, v in sp.__dict__.items() if not k.startswith("_")}
            for sp in (app.sub_processes or [])
        ]

        grad_payload = None
        if revealed:
            grad_payload = {
                "user_id": app.graduate_id,
                "first_name": grad.get("first_name", "Egresado"),
                "last_name": grad.get("last_name", f"#{app.graduate_id}"),
                "program_id": program_id,
                "graduation_year": grad_year,
            }

        results.append({
            "id": app.id,
            "job_offer_id": app.job_offer_id,
            "alias": alias,
            "status": st,
            "application_date": app.application_date.isoformat() if app.application_date else _now_iso(),
            "match_score": round(match_scores.get(app.graduate_id, 0.0), 1),
            "identity_revealed": revealed,
            "headline": headline,
            "program_id": program_id,
            "graduation_year": grad_year,
            "experience_years": exp_years,
            "top_skills": top_skills,
            "cover_letter_available": bool(app.cover_letter),
            "rejection_reason": app.rejection_reason,
            "sub_processes": sub_procs,
            "graduate": grad_payload,
        })

    return results


def _load_application_and_verify(application_id: int, current_user: dict, db: Session) -> models.CandidateApplication:
    query = (
        db.query(models.CandidateApplication)
        .options(joinedload(models.CandidateApplication.job_offer))
        .filter(models.CandidateApplication.id == application_id)
    )
    if current_user["role_id"] != 1:
        query = query.join(models.JobOffer).filter(models.JobOffer.company_id == current_user["id"])

    app = query.first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada o sin permisos")
    return app


def get_blind_candidate_profile(application_id: int, current_user: dict, db: Session) -> Dict[str, Any]:
    app = _load_application_and_verify(application_id, current_user, db)
    st = _status_str(app.status)
    revealed = st in REVEALED_STATUSES
    alias = make_candidate_alias(app.job_offer_id, app.graduate_id)

    try:
        grad = graduates_adapter.get_graduate(app.graduate_id) or {}
    except Exception:
        grad = {}

    names_to_scrub: List[str] = [
        grad.get("first_name") or "",
        grad.get("last_name") or "",
    ]
    for exp in grad.get("experiences") or []:
        if exp.get("company_name"):
            names_to_scrub.append(str(exp["company_name"]))
    for edu in grad.get("academic_histories") or []:
        if edu.get("institution"):
            names_to_scrub.append(str(edu["institution"]))

    experiences_clean = []
    for exp in grad.get("experiences") or []:
        start_raw = exp.get("start_date")
        end_raw = exp.get("end_date")
        months = 6
        try:
            start_d = date.fromisoformat(str(start_raw)[:10]) if start_raw else None
            end_d = date.fromisoformat(str(end_raw)[:10]) if end_raw else date.today()
            if start_d and end_d >= start_d:
                months = max(1, int((end_d - start_d).days / 30.4))
        except Exception:
            pass
        experiences_clean.append({
            "position": exp.get("position") or "Profesional",
            "duration_months": months,
            "is_current": exp.get("end_date") is None,
            "description": ai_client.scrub_pii(exp.get("description") or "", names=names_to_scrub, limit=600),
        })

    education_clean = []
    for edu in grad.get("academic_histories") or []:
        end_raw = edu.get("end_date")
        yr = None
        if end_raw:
            try:
                yr = int(str(end_raw)[:4])
            except Exception:
                yr = None
        education_clean.append({
            "degree": edu.get("degree") or "Pregrado Universitario",
            "year_completed": yr or grad.get("graduation_year"),
        })

    certs_clean = []
    for cert in grad.get("certifications") or []:
        iss_raw = cert.get("issue_date")
        yr = None
        if iss_raw:
            try:
                yr = int(str(iss_raw)[:4])
            except Exception:
                yr = None
        certs_clean.append({
            "name": cert.get("name") or "Certificación",
            "year": yr,
        })

    projects_clean = []
    for proj in grad.get("projects") or []:
        projects_clean.append({
            "title": ai_client.scrub_pii(proj.get("title") or "Proyecto Aplicado", names=names_to_scrub, limit=120),
            "description": ai_client.scrub_pii(proj.get("description") or "", names=names_to_scrub, limit=500),
            "technologies": proj.get("technologies") or "",
        })

    match_score = 0.0
    try:
        from app.matchmaking.models import Match
        m = db.query(Match).filter_by(job_offer_id=app.job_offer_id, graduate_id=app.graduate_id).first()
        if m:
            match_score = float(m.score)
    except Exception:
        match_score = 0.0

    skills_clean = _extract_skill_names(grad)
    exp_years = _calc_experience_years(grad.get("experiences") or [])

    return {
        "application_id": app.id,
        "alias": alias,
        "identity_revealed": revealed,
        "program_id": grad.get("program_id") or (app.job_offer.program_id if app.job_offer else 1),
        "graduation_year": grad.get("graduation_year") or 2024,
        "experience_years": exp_years,
        "availability_status": grad.get("availability_status") or "open_to_work",
        "preferred_modality": grad.get("preferred_modality") or "Cualquiera",
        "expected_salary": grad.get("expected_salary"),
        "profile_summary": ai_client.scrub_pii(grad.get("profile_summary") or "", names=names_to_scrub, limit=800),
        "skills": skills_clean,
        "experiences": experiences_clean,
        "education": education_clean,
        "certifications": certs_clean,
        "projects": projects_clean,
        "cover_letter": ai_client.scrub_pii(app.cover_letter or "", names=names_to_scrub, limit=800) if app.cover_letter else None,
        "match_score": round(match_score, 1),
    }


def generate_blind_ai_summary(
    application_id: int,
    current_user: dict,
    db: Session,
    force: bool = False,
) -> Dict[str, Any]:
    app = _load_application_and_verify(application_id, current_user, db)
    blind_profile = get_blind_candidate_profile(application_id, current_user, db)
    job = app.job_offer

    cache_k = ai_client.cache_key("blind_ai_summary_v1", application_id, blind_profile["match_score"], len(blind_profile["skills"]))
    if not force:
        cached = ai_client.cache_get(cache_k)
        if cached:
            return cached

    # Heuristic fallback calculation
    req_exp = float(job.min_experience_years or 0) if job else 0.0
    cand_exp = float(blind_profile["experience_years"] or 0.0)
    cand_skill_names = [s["name"] for s in blind_profile["skills"]]

    base_score = int(round(blind_profile["match_score"])) if blind_profile["match_score"] > 0 else 68
    if cand_exp >= req_exp and len(cand_skill_names) >= 3:
        base_score = max(base_score, 78)
    fit_score = max(35, min(98, base_score))
    fit_label = "Alto" if fit_score >= 78 else ("Medio" if fit_score >= 55 else "Bajo")

    strengths = []
    gaps = []
    if job and blind_profile["program_id"] == job.program_id:
        strengths.append("Formación académica directamente alineada con el programa requerido por la vacante.")
    if cand_exp >= req_exp:
        strengths.append(f"Cumple con la experiencia solicitada ({cand_exp} años frente a {req_exp:g} requeridos).")
    else:
        gaps.append(f"Experiencia práctica inferior al mínimo sugerido ({cand_exp} años vs. {req_exp:g} años).")

    if cand_skill_names:
        strengths.append(f"Domina competencias técnicas relevantes: {', '.join(cand_skill_names[:5])}.")
    else:
        gaps.append("No registra habilidades técnicas detalladas en su perfil estructurado.")

    if blind_profile["projects"]:
        strengths.append(f"Cuenta con {len(blind_profile['projects'])} proyecto(s) aplicado(s) en portafolio.")
    if not gaps:
        gaps.append("Validar profundidad práctica en escenarios de alta complejidad durante la entrevista técnica.")

    evidence = [
        f"Puntaje objetivo de afinidad algorítmica: {blind_profile['match_score']}%.",
        f"Experiencia verificada acumulada: {cand_exp} años en {len(blind_profile['experiences'])} rol(es).",
        f"Certificaciones registradas: {len(blind_profile['certifications'])} · Proyectos: {len(blind_profile['projects'])}.",
    ]

    job_title = job.title if job else "la vacante"
    interview_questions = [
        f"Cuéntanos sobre el reto técnico más complejo que resolviste en tu rol como {blind_profile['experiences'][0]['position'] if blind_profile['experiences'] else 'profesional'} y qué métricas de impacto obtuviste.",
        f"¿Cómo aplicarías tus conocimientos en {', '.join(cand_skill_names[:2]) if cand_skill_names else 'tu área de especialidad'} durante los primeros 60 días en el cargo de {job_title}?",
        "Describe una situación en la que tuviste que aprender una herramienta o normativa bajo presión de tiempo: ¿cómo lo abordaste?",
    ]

    heuristic_result = {
        "source": "heuristic",
        "model": None,
        "generated_at": _now_iso(),
        "application_id": app.id,
        "alias": blind_profile["alias"],
        "fit_label": fit_label,
        "fit_score": fit_score,
        "executive_summary": (
            f"{blind_profile['alias']} presenta un ajuste {fit_label.lower()} ({fit_score}/100) para la vacante de {job_title}. "
            f"Aporta {cand_exp} años de experiencia acumulada, formación de la cohorte {blind_profile['graduation_year']} "
            f"y {len(cand_skill_names)} competencia(s) clave evaluadas sin sesgos demográficos."
        ),
        "strengths": strengths[:4],
        "gaps": gaps[:3],
        "evidence": evidence,
        "interview_questions": interview_questions,
        "bias_guard": "Dictamen generado bajo protocolo Blind Hiring: sin nombre, género, edad, foto, contacto ni nombres de instituciones.",
    }

    if not ai_client.is_enabled():
        return heuristic_result

    try:
        ai_client.check_rate_limit(f"company_ai_{current_user['id']}", max_calls=25, window_seconds=600)
    except ai_client.AIRateLimited as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    system_prompt = (
        "Eres un Copiloto IA de Selección Objetiva (Blind Hiring) para empresas aliadas de la Universidad Popular del Cesar. "
        "Evalúas candidatos exclusivamente por sus méritos, competencias, experiencia y proyectos, eliminando cualquier sesgo. "
        + ai_client.INJECTION_GUARD
        + "\nDevuelve un JSON con las claves exactas: "
        "fit_label ('Alto' | 'Medio' | 'Bajo'), "
        "fit_score (entero 0..100), "
        "executive_summary (string de 2-3 oraciones ejecutivas y neutrales refiriéndose al candidato por su alias), "
        "strengths (lista de 3-4 strings concretos), "
        "gaps (lista de 1-3 brechas u oportunidades de validación), "
        "evidence (lista de 3 hechos verificables del perfil), "
        "interview_questions (lista de 3 preguntas conductuales/técnicas personalizadas)."
    )

    job_context = {
        "title": job.title if job else "",
        "requirements": (job.requirements or "")[:600] if job else "",
        "functions": (job.functions or "")[:600] if job else "",
        "min_experience_years": job.min_experience_years if job else 0,
        "modality": job.modality if job else "",
    }
    user_prompt = (
        f"Vacante:\n{job_context}\n\n"
        f"Perfil Anonimizado ({blind_profile['alias']}):\n{ai_client.untrusted(str(blind_profile))}"
    )

    try:
        llm = ai_client.chat_json(system_prompt, user_prompt, temperature=0.25, max_tokens=1200)
        raw_score = llm.get("fit_score")
        parsed_score = int(raw_score) if isinstance(raw_score, (int, float)) else fit_score
        parsed_score = max(0, min(100, parsed_score))
        raw_label = str(llm.get("fit_label") or fit_label).capitalize()
        if raw_label not in ("Alto", "Medio", "Bajo"):
            raw_label = "Alto" if parsed_score >= 78 else ("Medio" if parsed_score >= 55 else "Bajo")

        result = {
            **heuristic_result,
            "source": "groq",
            "model": ai_client.model_name(False),
            "generated_at": _now_iso(),
            "fit_label": raw_label,
            "fit_score": parsed_score,
            "executive_summary": str(llm.get("executive_summary") or heuristic_result["executive_summary"]),
            "strengths": llm.get("strengths") if isinstance(llm.get("strengths"), list) and llm.get("strengths") else heuristic_result["strengths"],
            "gaps": llm.get("gaps") if isinstance(llm.get("gaps"), list) and llm.get("gaps") else heuristic_result["gaps"],
            "evidence": llm.get("evidence") if isinstance(llm.get("evidence"), list) and llm.get("evidence") else heuristic_result["evidence"],
            "interview_questions": llm.get("interview_questions") if isinstance(llm.get("interview_questions"), list) and llm.get("interview_questions") else heuristic_result["interview_questions"],
        }
        ai_client.cache_set(cache_k, result, ttl_seconds=900)
        return result
    except ai_client.AIUnavailable:
        return heuristic_result

