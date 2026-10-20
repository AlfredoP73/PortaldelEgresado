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

def get_surveys(db: Session):
    return db.query(models.Survey).filter(models.Survey.is_active == True).all()

def get_survey_response(survey_id: int, current_user: dict, db: Session):
    response = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.survey_id == survey_id,
        models.SurveyResponse.graduate_id == current_user["id"]
    ).first()
    return response

def submit_survey_response(survey_id: int, answers: list, current_user: dict, db: Session):
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
    
    adapter = RabbitMQMatchmakingAdapter()
    adapter.trigger_recalculate(graduate_id=current_user["id"])
    
    return new_response

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

