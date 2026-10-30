from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from typing import Optional
from datetime import datetime
from app.graduates import models, schemas
import app.companies.models as company_models
import httpx
from app.core.adapters import RabbitMQMatchmakingAdapter, HttpCompaniesAdapter

companies_adapter = HttpCompaniesAdapter()

def get_jobs(skip: int, limit: int, q: Optional[str], salary_min: Optional[int], db: Session):
    params = {"skip": skip, "limit": limit}
    if q: params["q"] = q
    if salary_min: params["salary_min"] = salary_min
    
    try:
        return companies_adapter.get_jobs(params)
    except Exception as e:
        print(f"Warning: companies_adapter.get_jobs failed (Companies service starting/down): {e}")
        return []

def apply_for_job(application: schemas.ApplicationCreate, current_user: dict, db: Session):
    from app.graduates.services.graduate_service import ensure_graduate_verified
    ensure_graduate_verified(current_user, db)
    try:
        payload = {
            "graduate_id": current_user["id"],
            "job_offer_id": application.job_offer_id,
        }
        if application.cover_letter:
            payload["cover_letter"] = application.cover_letter
        return companies_adapter.apply_for_job(payload)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            error_detail = e.response.json().get("detail", "Error en postulación")
            raise HTTPException(status_code=400, detail=error_detail)
        raise HTTPException(status_code=e.response.status_code, detail=f"Error desde Companies: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Companies: {str(e)}")

def get_my_applications(current_user: dict, db: Session):
    try:
        return companies_adapter.get_my_applications(current_user['id'])
    except Exception as e:
        print(f"Warning: companies_adapter.get_my_applications failed (Companies service starting/down): {e}")
        return []

def _normalize_questions(questions: list) -> list:
    if not isinstance(questions, list) or len(questions) == 0:
        raise HTTPException(status_code=400, detail="La encuesta debe incluir al menos una pregunta.")
    normalized = []
    for idx, raw_q in enumerate(questions):
        if not isinstance(raw_q, dict):
            continue
        q_text = str(raw_q.get("question") or raw_q.get("text") or "").strip()
        if not q_text:
            raise HTTPException(status_code=400, detail=f"La pregunta #{idx + 1} no tiene enunciado.")
        q_type = str(raw_q.get("type") or "radio").strip().lower()
        if q_type not in ("radio", "checkbox", "scale", "select", "text", "textarea"):
            q_type = "text"
        raw_opts = raw_q.get("options") or []
        opts = [str(o).strip() for o in raw_opts if str(o).strip()]
        if q_type == "scale" and not opts:
            opts = [
                "1 - Muy insatisfecho",
                "2 - Insatisfecho",
                "3 - Neutral",
                "4 - Satisfecho",
                "5 - Muy satisfecho",
            ]
        if q_type in ("radio", "checkbox", "select") and len(opts) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"La pregunta '{q_text[:50]}' requiere al menos 2 opciones de respuesta.",
            )
        normalized.append({
            "id": str(raw_q.get("id") or f"q_{idx + 1}_{int(datetime.utcnow().timestamp())}"),
            "section": str(raw_q.get("section") or "Seguimiento General").strip(),
            "question": q_text,
            "type": q_type,
            "required": bool(raw_q.get("required", True)),
            "options": opts,
        })
    if not normalized:
        raise HTTPException(status_code=400, detail="La encuesta debe contener preguntas válidas.")
    return normalized


def _serialize_survey(survey: models.Survey, responses_count: int = 0, program_map: dict = None) -> dict:
    prog_name = None
    if survey.target_program_id and program_map:
        prog_name = program_map.get(survey.target_program_id)
    return {
        "id": survey.id,
        "title": survey.title,
        "description": survey.description,
        "moment_code": getattr(survey, "moment_code", None) or "M1",
        "category": getattr(survey, "category", None) or "Empleabilidad y Pertinencia (OLE/CNA)",
        "target_program_id": getattr(survey, "target_program_id", None),
        "target_program_name": prog_name,
        "target_graduation_year": getattr(survey, "target_graduation_year", None),
        "is_mandatory": bool(getattr(survey, "is_mandatory", False)),
        "closes_at": getattr(survey, "closes_at", None),
        "questions_json": survey.questions_json or [],
        "is_active": bool(survey.is_active),
        "created_at": survey.created_at,
        "updated_at": getattr(survey, "updated_at", None),
        "responses_count": responses_count,
    }


def get_surveys(db: Session, current_user: Optional[dict] = None):
    from datetime import date
    from sqlalchemy import func
    today = date.today()
    grad = None
    if current_user and current_user.get("role_id") == 3:
        grad = db.query(models.Graduate).filter(models.Graduate.user_id == current_user.get("id")).first()

    programs = {p.id: p.name for p in db.query(models.Program).all()}
    counts = dict(
        db.query(models.SurveyResponse.survey_id, func.count(models.SurveyResponse.id))
        .group_by(models.SurveyResponse.survey_id)
        .all()
    )

    active_surveys = (
        db.query(models.Survey)
        .filter(models.Survey.is_active == True)
        .order_by(models.Survey.is_mandatory.desc(), models.Survey.id.asc())
        .all()
    )

    visible = []
    for s in active_surveys:
        closes = getattr(s, "closes_at", None)
        if closes and closes < today:
            continue
        if grad:
            t_prog = getattr(s, "target_program_id", None)
            if t_prog and t_prog != grad.program_id:
                continue
            t_year = getattr(s, "target_graduation_year", None)
            if t_year and t_year != grad.graduation_year:
                continue
        visible.append(_serialize_survey(s, counts.get(s.id, 0), programs))
    return visible

def get_survey_response(survey_id: int, current_user: dict, db: Session):
    response = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.survey_id == survey_id,
        models.SurveyResponse.graduate_id == current_user["id"]
    ).first()
    return response

def submit_survey_response(survey_id: int, answers: list, current_user: dict, db: Session):
    from app.graduates.services.graduate_service import ensure_graduate_verified
    ensure_graduate_verified(current_user, db)
    existing = db.query(models.SurveyResponse).filter_by(
        survey_id=survey_id, graduate_id=current_user["id"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya has respondido esta encuesta")
        
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    answers_dict = {a.question_id: a.answer for a in answers} if isinstance(answers, list) else answers
    new_response = models.SurveyResponse(
        survey_id=survey_id,
        graduate_id=current_user["id"],
        answers_json=answers_dict
    )
    db.add(new_response)
    db.commit()
    db.refresh(new_response)
    
    try:
        adapter = RabbitMQMatchmakingAdapter()
        adapter.trigger_recalculate(graduate_id=current_user["id"])
    except Exception as e:
        print(f"Warning: RabbitMQ trigger after survey submit failed: {e}")
    
    return new_response


# ── Servicios Administrativos de Encuestas (MEN / OLE / CNA) ─────────────────
def get_official_survey_templates():
    from app.graduates.services.survey_templates import OFFICIAL_SURVEY_TEMPLATES
    return OFFICIAL_SURVEY_TEMPLATES


def admin_list_surveys(db: Session):
    from sqlalchemy import func
    programs = {p.id: p.name for p in db.query(models.Program).all()}
    counts = dict(
        db.query(models.SurveyResponse.survey_id, func.count(models.SurveyResponse.id))
        .group_by(models.SurveyResponse.survey_id)
        .all()
    )
    rows = db.query(models.Survey).order_by(models.Survey.id.desc()).all()
    return [_serialize_survey(s, counts.get(s.id, 0), programs) for s in rows]


def admin_create_survey(payload: schemas.SurveyCreate, db: Session):
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="El título de la encuesta es obligatorio.")
    questions = _normalize_questions(payload.questions_json)

    new_survey = models.Survey(
        title=title,
        description=(payload.description or "").strip() or None,
        moment_code=(payload.moment_code or "M1").strip().upper(),
        category=(payload.category or "Empleabilidad y Pertinencia (OLE/CNA)").strip(),
        target_program_id=payload.target_program_id or None,
        target_graduation_year=payload.target_graduation_year or None,
        is_mandatory=bool(payload.is_mandatory),
        closes_at=payload.closes_at,
        questions_json=questions,
        is_active=bool(payload.is_active),
    )
    db.add(new_survey)
    db.commit()
    db.refresh(new_survey)
    programs = {p.id: p.name for p in db.query(models.Program).all()}
    return _serialize_survey(new_survey, 0, programs)


def admin_update_survey(survey_id: int, payload: schemas.SurveyUpdate, db: Session):
    from sqlalchemy import func
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    if "title" in update_data:
        t = (update_data["title"] or "").strip()
        if not t:
            raise HTTPException(status_code=400, detail="El título no puede estar vacío.")
        survey.title = t
    if "description" in update_data:
        survey.description = (update_data["description"] or "").strip() or None
    if "moment_code" in update_data and update_data["moment_code"] is not None:
        survey.moment_code = update_data["moment_code"].strip().upper()
    if "category" in update_data and update_data["category"] is not None:
        survey.category = update_data["category"].strip()
    if "target_program_id" in update_data:
        survey.target_program_id = update_data["target_program_id"] or None
    if "target_graduation_year" in update_data:
        survey.target_graduation_year = update_data["target_graduation_year"] or None
    if "is_mandatory" in update_data and update_data["is_mandatory"] is not None:
        survey.is_mandatory = bool(update_data["is_mandatory"])
    if "closes_at" in update_data:
        survey.closes_at = update_data["closes_at"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        survey.is_active = bool(update_data["is_active"])
    if "questions_json" in update_data and update_data["questions_json"] is not None:
        survey.questions_json = _normalize_questions(update_data["questions_json"])

    survey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    programs = {p.id: p.name for p in db.query(models.Program).all()}
    cnt = db.query(func.count(models.SurveyResponse.id)).filter(models.SurveyResponse.survey_id == survey_id).scalar() or 0
    return _serialize_survey(survey, cnt, programs)


def admin_toggle_survey(survey_id: int, db: Session):
    from sqlalchemy import func
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada.")
    survey.is_active = not bool(survey.is_active)
    survey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(survey)
    programs = {p.id: p.name for p in db.query(models.Program).all()}
    cnt = db.query(func.count(models.SurveyResponse.id)).filter(models.SurveyResponse.survey_id == survey_id).scalar() or 0
    return _serialize_survey(survey, cnt, programs)


def admin_duplicate_survey(survey_id: int, db: Session):
    import copy
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada.")
    dup = models.Survey(
        title=f"Copia de {survey.title}"[:250],
        description=survey.description,
        moment_code=getattr(survey, "moment_code", "M1"),
        category=getattr(survey, "category", "Empleabilidad y Pertinencia (OLE/CNA)"),
        target_program_id=getattr(survey, "target_program_id", None),
        target_graduation_year=getattr(survey, "target_graduation_year", None),
        is_mandatory=bool(getattr(survey, "is_mandatory", False)),
        closes_at=getattr(survey, "closes_at", None),
        questions_json=copy.deepcopy(survey.questions_json or []),
        is_active=False,
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    programs = {p.id: p.name for p in db.query(models.Program).all()}
    return _serialize_survey(dup, 0, programs)


def admin_delete_survey(survey_id: int, db: Session):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada.")
    db.query(models.SurveyResponse).filter(models.SurveyResponse.survey_id == survey_id).delete()
    db.delete(survey)
    db.commit()
    return {"message": "Encuesta eliminada exitosamente", "id": survey_id}


def admin_get_survey_results(survey_id: int, db: Session):
    survey = db.query(models.Survey).filter(models.Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada.")

    programs = {p.id: p.name for p in db.query(models.Program).all()}
    responses = (
        db.query(models.SurveyResponse)
        .filter(models.SurveyResponse.survey_id == survey_id)
        .order_by(models.SurveyResponse.submitted_at.desc())
        .all()
    )
    grad_ids = [r.graduate_id for r in responses]
    grads = (
        {g.user_id: g for g in db.query(models.Graduate).filter(models.Graduate.user_id.in_(grad_ids)).all()}
        if grad_ids else {}
    )

    total_responses = len(responses)
    questions = survey.questions_json or []
    question_stats = []

    for q in questions:
        qid = str(q.get("id"))
        qtype = str(q.get("type") or "radio")
        opts = q.get("options") or []
        option_counts = {str(o): 0 for o in opts}
        text_answers = []
        numeric_scores = []
        answered_count = 0

        for r in responses:
            ans_map = r.answers_json or {}
            val = ans_map.get(qid)
            if val is None or val == "" or val == []:
                continue
            answered_count += 1

            if qtype == "checkbox" and isinstance(val, list):
                for item in val:
                    s_item = str(item)
                    option_counts[s_item] = option_counts.get(s_item, 0) + 1
            elif qtype in ("radio", "select", "scale"):
                s_val = str(val)
                option_counts[s_val] = option_counts.get(s_val, 0) + 1
                if qtype == "scale":
                    head = s_val.split("-")[0].strip()
                    if head.isdigit():
                        numeric_scores.append(int(head))
            else:
                text_answers.append({
                    "graduate_id": r.graduate_id,
                    "graduate_name": f"{grads[r.graduate_id].first_name} {grads[r.graduate_id].last_name}" if r.graduate_id in grads else f"Egresado #{r.graduate_id}",
                    "answer": str(val),
                    "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
                })

        breakdown = []
        denom = max(1, answered_count)
        for opt_label, cnt in option_counts.items():
            breakdown.append({
                "option": opt_label,
                "count": cnt,
                "percentage": round((cnt / denom) * 100, 1) if answered_count > 0 else 0.0,
            })

        avg_scale = round(sum(numeric_scores) / len(numeric_scores), 2) if numeric_scores else None
        question_stats.append({
            "id": qid,
            "section": q.get("section") or "General",
            "question": q.get("question"),
            "type": qtype,
            "answered_count": answered_count,
            "average_scale": avg_scale,
            "breakdown": breakdown,
            "text_answers": text_answers,
        })

    respondent_rows = []
    for r in responses:
        g = grads.get(r.graduate_id)
        respondent_rows.append({
            "response_id": r.id,
            "graduate_id": r.graduate_id,
            "graduate_name": f"{g.first_name} {g.last_name}" if g else f"Egresado #{r.graduate_id}",
            "program_name": programs.get(g.program_id, "N/A") if g else "N/A",
            "graduation_year": g.graduation_year if g else None,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "answers": r.answers_json or {},
        })

    return {
        "survey": _serialize_survey(survey, total_responses, programs),
        "total_responses": total_responses,
        "question_stats": question_stats,
        "respondents": respondent_rows,
    }

def get_saved_jobs(current_user: dict, db: Session):
    rows = db.query(models.SavedJob).filter(
        models.SavedJob.graduate_id == current_user["id"]
    ).order_by(models.SavedJob.created_at.desc()).all()
    saved_ids = [r.job_offer_id for r in rows]
    return {"saved_job_ids": saved_ids}

def toggle_saved_job(job_offer_id: int, current_user: dict, db: Session):
    grad_id = current_user["id"]
    existing = db.query(models.SavedJob).filter(
        models.SavedJob.graduate_id == grad_id,
        models.SavedJob.job_offer_id == job_offer_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        is_saved = False
    else:
        db.add(models.SavedJob(graduate_id=grad_id, job_offer_id=job_offer_id))
        db.commit()
        is_saved = True

    rows = db.query(models.SavedJob).filter(models.SavedJob.graduate_id == grad_id).all()
    return {
        "saved": is_saved,
        "job_offer_id": job_offer_id,
        "saved_job_ids": [r.job_offer_id for r in rows],
    }

def get_job_affinity_breakdown(job_offer_id: int, current_user: dict, db: Session):
    from datetime import date
    grad_id = current_user["id"]
    grad = db.query(models.Graduate).filter(models.Graduate.user_id == grad_id).first()
    all_skills = {s.id: s.name for s in db.query(models.Skill).all()}

    try:
        jobs = companies_adapter.get_jobs({"skip": 0, "limit": 200})
        job = next((j for j in (jobs if isinstance(jobs, list) else []) if j.get("id") == job_offer_id), None)
    except Exception as e:
        print(f"Warning: companies_adapter.get_jobs failed in affinity breakdown: {e}")
        job = None
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada o temporalmente no disponible")

    grad_skill_map = {}
    total_exp_years = 0.0
    if grad:
        grad_skill_map = {sk.skill_id: sk.proficiency_level for sk in grad.skills}
        total_days = 0
        for exp in grad.experiences:
            if exp.start_date:
                end = exp.end_date or date.today()
                total_days += max(0, (end - exp.start_date).days)
        total_exp_years = round(total_days / 365.25, 1)

    job_skills = job.get("skills") or []
    matched_skills = []
    missing_skills = []

    for jsk in job_skills:
        sid = jsk.get("skill_id")
        req_lvl = jsk.get("required_level") or "Intermedio"
        sname = all_skills.get(sid, f"Habilidad #{sid}")
        if sid in grad_skill_map:
            matched_skills.append({
                "skill_id": sid,
                "name": sname,
                "proficiency_level": grad_skill_map[sid],
                "required_level": req_lvl,
            })
        else:
            missing_skills.append({
                "skill_id": sid,
                "name": sname,
                "required_level": req_lvl,
            })

    # If the job offer doesn't have explicit rows in job_offer_skills, infer from catalog skills mentioned in requirements/description
    if not job_skills and all_skills:
        text_corpus = f"{job.get('title', '')} {job.get('requirements', '')} {job.get('description', '')}".lower()
        for sid, sname in all_skills.items():
            if sname.lower() in text_corpus:
                if sid in grad_skill_map:
                    matched_skills.append({
                        "skill_id": sid,
                        "name": sname,
                        "proficiency_level": grad_skill_map[sid],
                        "required_level": "Intermedio",
                    })
                else:
                    missing_skills.append({
                        "skill_id": sid,
                        "name": sname,
                        "required_level": "Intermedio",
                    })

    total_req_skills = len(matched_skills) + len(missing_skills)
    skills_pct = round((len(matched_skills) / total_req_skills) * 100) if total_req_skills > 0 else 80

    program_matched = bool(grad and job.get("program_id") == grad.program_id)
    program_pct = 100 if program_matched else 45

    req_exp = int(job.get("min_experience_years") or 0)
    exp_matched = total_exp_years >= req_exp
    exp_pct = 100 if exp_matched else (round((total_exp_years / max(1, req_exp)) * 100))

    expected_sal = getattr(grad, "expected_salary", None) if grad else None
    sal_min = job.get("salary_min")
    sal_max = job.get("salary_max")
    salary_aligned = True
    if expected_sal and sal_max and expected_sal > sal_max * 1.15:
        salary_aligned = False

    total_score = round(0.45 * skills_pct + 0.35 * program_pct + 0.20 * exp_pct)

    return {
        "job_offer_id": job_offer_id,
        "total_score": total_score,
        "skills_score": skills_pct,
        "program_score": program_pct,
        "experience_score": exp_pct,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "program_match": {
            "matched": program_matched,
            "graduate_program_id": grad.program_id if grad else None,
            "job_program_id": job.get("program_id"),
        },
        "experience_match": {
            "matched": exp_matched,
            "graduate_years": total_exp_years,
            "required_years": req_exp,
        },
        "salary_alignment": {
            "aligned": salary_aligned,
            "expected_salary": expected_sal,
            "salary_min": sal_min,
            "salary_max": sal_max,
        },
        "recommended_pitch": (
            f"Hola equipo de {job.get('company', {}).get('name', 'Selección')}, "
            f"soy egresado de la UPC con disponibilidad {getattr(grad, 'availability_notice', 'Inmediata').lower() if grad else 'inmediata'}. "
            f"Me entusiasma postularme al cargo de {job.get('title', '')}; cuento con dominio en "
            f"{', '.join([m['name'] for m in matched_skills[:3]]) if matched_skills else 'las competencias clave del rol'} "
            f"y {total_exp_years} año(s) de experiencia práctica para aportar resultados desde el primer día."
        ),
    }

def get_companies_directory(db: Session):
    try:
        return companies_adapter.get_companies_directory()
    except Exception as e:
        print(f"Warning: companies_adapter.get_companies_directory failed: {e}")
        return []

def get_interview_prep(job_offer_id: int, current_user: dict, db: Session):
    try:
        jobs = companies_adapter.get_jobs({"skip": 0, "limit": 200})
        job = next((j for j in (jobs if isinstance(jobs, list) else []) if j.get("id") == job_offer_id), None)
    except Exception as e:
        print(f"Warning: companies_adapter.get_jobs failed in interview prep: {e}")
        job = None
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada o temporalmente no disponible")

    all_skills = {s.id: s.name for s in db.query(models.Skill).all()}
    job_skills = [all_skills.get(sk.get("skill_id"), f"Habilidad #{sk.get('skill_id')}") for sk in (job.get("skills") or [])]
    title = job.get("title", "Profesional")
    company_name = job.get("company", {}).get("name", "la empresa")
    sector_name = (job.get("company", {}).get("sector") or {}).get("name", "el sector")
    modality = job.get("modality", "Presencial")

    primary_skill = job_skills[0] if len(job_skills) > 0 else "herramientas técnicas del cargo"
    secondary_skill = job_skills[1] if len(job_skills) > 1 else "resolución de problemas y trabajo en equipo"

    return {
        "job_offer_id": job_offer_id,
        "job_title": title,
        "company_name": company_name,
        "sector_name": sector_name,
        "modality": modality,
        "key_skills": job_skills,
        "technical_questions": [
            {
                "question": f"¿Cómo has aplicado {primary_skill} en un proyecto académico o laboral reciente para resolver un problema complejo?",
                "tip": "Estructura tu respuesta explicando el reto técnico, la arquitectura o metodología que elegiste y el resultado medible obtenido.",
                "category": "Competencia Técnica Principal"
            },
            {
                "question": f"Para el rol de {title} en {company_name}, ¿cómo garantizarías la calidad y cumplimiento de entregables usando {secondary_skill}?",
                "tip": "Menciona estándares de calidad, pruebas, validación con usuarios o indicadores de desempeño (KPIs).",
                "category": "Ejecución y Calidad"
            },
            {
                "question": f"Si tuvieras que asumir las funciones de '{(job.get('functions') or title)[:90]}...' durante tus primeros 30 días, ¿cuál sería tu plan de acción?",
                "tip": "Divide tu respuesta en: Semana 1 (diagnóstico y entendimiento), Semana 2-3 (primeras entregas rápidas) y Semana 4 (optimización).",
                "category": "Plan 30-60-90 Días"
            }
        ],
        "behavioral_questions": [
            {
                "question": f"Cuéntanos sobre una ocasión en la que tuviste que aprender una tecnología o proceso desde cero bajo presión de tiempo.",
                "tip": "Usa el método STAR (Situación, Tarea, Acción, Resultado) destacando tu capacidad de aprendizaje autónomo como egresado UPC.",
                "category": "Método STAR · Adaptabilidad"
            },
            {
                "question": f"¿Por qué te interesa vincularte a {company_name} dentro del sector de {sector_name} y qué valor diferencial aportas?",
                "tip": "Conecta la misión de la empresa con tu formación en la UPC y tus proyectos prácticos.",
                "category": "Ajuste Cultural y Motivación"
            }
        ],
        "checklist": [
            f"Repasar los requisitos clave publicados por {company_name}",
            f"Preparar 2 ejemplos prácticos aplicando {primary_skill}",
            f"Verificar conexión, cámara y entorno (Modalidad: {modality})",
            "Tener a la mano tu Hoja de Vida PDF actualizada en el Portal UPC",
        ]
    }

