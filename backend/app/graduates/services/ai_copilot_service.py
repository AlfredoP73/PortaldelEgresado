"""
Servicio del Copiloto IA para el Egresado (Módulo 1: Graduates).

Proporciona:
1. Diagnóstico 360° del perfil profesional (7 dimensiones + victorias rápidas + resumen mejorado + plan 30 días).
2. Reescritura inteligente con metodología STAR (resumen, experiencia, proyecto, titular, carta de presentación).
3. Asistente conversacional de empleabilidad contextualizado con el perfil real del egresado UPC.

Utiliza la API de Groq (`app.core.ai_client`) y degrada con elegancia a un motor heurístico
experto local cuando `GROQ_API_KEY` no está configurada o el servicio externo no responde.
"""

from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import ai_client
from app.graduates import models


PROGRAM_DEFAULT_SKILLS: Dict[str, List[Dict[str, str]]] = {
    "sistemas": [
        {"name": "Python", "reason": "Lenguaje de alta demanda en backend, ciencia de datos y automatización."},
        {"name": "SQL", "reason": "Indispensable para consultas y modelado de bases de datos relacionales."},
        {"name": "Docker", "reason": "Estándar de la industria para contenerización y despliegues en la nube."},
        {"name": "AWS / Cloud", "reason": "Valorado en arquitecturas modernas y microservicios."},
        {"name": "Git", "reason": "Control de versiones requerido en el 95% de vacantes tecnológicas."},
    ],
    "administracion": [
        {"name": "Excel Avanzado", "reason": "Fundamental para modelado financiero y control de gestión."},
        {"name": "Power BI", "reason": "Competencia clave en inteligencia de negocios y toma de decisiones."},
        {"name": "Gestión de Proyectos", "reason": "Aumenta la elegibilidad en cargos de coordinación y liderazgo."},
        {"name": "Scrum", "reason": "Metodología ágil solicitada en equipos multidisciplinarios."},
    ],
    "enfermeria": [
        {"name": "Atención Primaria en Salud", "reason": "Competencia nuclear en clínicas e IPS de la región."},
        {"name": "Seguridad del Paciente", "reason": "Estándar exigido en procesos de acreditación hospitalaria."},
        {"name": "Gestión Clínica", "reason": "Abre puertas a roles de coordinación asistencial."},
    ],
    "derecho": [
        {"name": "Contratación Estatal", "reason": "Alta demanda en entidades públicas y consultoría jurídica."},
        {"name": "Derecho Laboral", "reason": "Requerido en áreas jurídicas corporativas y talento humano."},
        {"name": "Conciliación y Arbitraje", "reason": "Diferenciador clave en resolución alternativa de conflictos."},
    ],
    "contaduria": [
        {"name": "NIIF", "reason": "Estándar contable internacional obligatorio en empresas medianas y grandes."},
        {"name": "Planeación Tributaria", "reason": "Alta valoración en firmas de auditoría y direcciones financieras."},
        {"name": "Excel Avanzado", "reason": "Herramienta transversal para análisis contable y financiero."},
    ],
    "default": [
        {"name": "Gestión de Proyectos", "reason": "Habilidad transversal altamente valorada por empleadores."},
        {"name": "Excel Avanzado", "reason": "Requerida para análisis de datos y reportes ejecutivos."},
        {"name": "Inglés B2", "reason": "Multiplica el acceso a vacantes remotas y multinacionales."},
        {"name": "Liderazgo", "reason": "Competencia socioemocional prioritaria en procesos de selección."},
    ],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _status_for_score(score: int) -> str:
    if score >= 85:
        return "excellent"
    if score >= 68:
        return "good"
    if score >= 45:
        return "improve"
    return "critical"


def _level_for_score(score: int) -> str:
    if score >= 85:
        return "Destacado"
    if score >= 70:
        return "Competitivo"
    if score >= 50:
        return "En desarrollo"
    return "Inicial"


def _gather_profile_snapshot(db: Session, graduate_id: int) -> Dict[str, Any]:
    grad = db.query(models.Graduate).filter(models.Graduate.user_id == graduate_id).first()
    if not grad:
        raise HTTPException(status_code=404, detail="Perfil de egresado no encontrado")

    prog_name = f"Programa #{grad.program_id}"
    try:
        prog = db.query(models.Program).filter(models.Program.id == grad.program_id).first()
        if prog and prog.name:
            prog_name = prog.name
    except Exception:
        pass

    experiences = []
    total_months = 0
    for exp in getattr(grad, "experiences", []) or []:
        start = exp.start_date
        end = exp.end_date or date.today()
        months = max(1, int((end - start).days / 30.4)) if start else 6
        total_months += months
        experiences.append({
            "position": exp.position,
            "company_name": exp.company_name,
            "months": months,
            "is_current": exp.end_date is None,
            "description": exp.description or "",
        })

    educations = [
        {
            "degree": edu.degree,
            "institution": edu.institution,
            "completed": edu.end_date.year if edu.end_date else grad.graduation_year,
        }
        for edu in (getattr(grad, "academic_histories", []) or [])
    ]

    certifications = [
        {
            "name": cert.name,
            "organization": cert.issuing_organization,
            "year": cert.issue_date.year if cert.issue_date else None,
        }
        for cert in (getattr(grad, "certifications", []) or [])
    ]

    projects = [
        {
            "title": p.title,
            "description": p.description or "",
            "technologies": p.technologies or "",
            "has_url": bool(p.project_url or p.repository_url or p.resource_url),
        }
        for p in (getattr(grad, "projects", []) or [])
    ]

    skills = []
    for sk in getattr(grad, "skills", []) or []:
        s_name = sk.skill.name if getattr(sk, "skill", None) else None
        if not s_name:
            skill_row = db.query(models.Skill).filter(models.Skill.id == sk.skill_id).first()
            s_name = skill_row.name if skill_row else f"Skill #{sk.skill_id}"
        skills.append({
            "name": s_name,
            "level": sk.proficiency_level or "Intermedio",
        })

    return {
        "user_id": grad.user_id,
        "first_name": grad.first_name,
        "last_name": grad.last_name,
        "program_id": grad.program_id,
        "program_name": prog_name,
        "graduation_year": grad.graduation_year,
        "phone": bool(grad.phone),
        "profile_summary": (grad.profile_summary or "").strip(),
        "has_cv": bool(grad.cv_url),
        "has_picture": bool(grad.profile_picture_url),
        "availability_status": grad.availability_status or "open_to_work",
        "preferred_modality": grad.preferred_modality or "Cualquiera",
        "expected_salary": grad.expected_salary,
        "directory_visible": bool(grad.directory_visible),
        "mentor_opt_in": bool(grad.mentor_opt_in),
        "total_experience_years": round(total_months / 12.0, 1),
        "experiences": experiences,
        "education": educations,
        "certifications": certifications,
        "projects": projects,
        "skills": skills,
    }


def _build_heuristic_analysis(snap: Dict[str, Any], target_role: Optional[str] = None) -> Dict[str, Any]:
    summary_text = snap["profile_summary"]
    summary_len = len(summary_text)
    if summary_len >= 220:
        summary_score = 90
        summary_findings = ["Tu resumen tiene buena extensión y contexto profesional."]
        summary_actions = ["Asegúrate de incluir 1 o 2 logros cuantificables y palabras clave del cargo objetivo."]
    elif summary_len >= 90:
        summary_score = 68
        summary_findings = ["Tienes un resumen base, pero aún puede comunicar mayor impacto y propuesta de valor."]
        summary_actions = ["Amplíalo a 3-4 oraciones indicando tu especialidad, años de práctica y resultados."]
    elif summary_len > 0:
        summary_score = 42
        summary_findings = ["Tu resumen profesional es demasiado breve para destacar ante reclutadores y filtros ATS."]
        summary_actions = ["Usa el botón 'Aplicar resumen sugerido' para estructurar tu perfil en primera persona."]
    else:
        summary_score = 18
        summary_findings = ["No has redactado tu resumen profesional."]
        summary_actions = ["Agrega un resumen ejecutivo de 3 a 4 líneas enfocado en tus fortalezas y metas."]

    exp_list = snap["experiences"]
    if len(exp_list) >= 2:
        detailed = sum(1 for e in exp_list if len(e.get("description") or "") >= 70)
        exp_score = 88 if detailed >= 1 else 70
        exp_findings = [f"Registras {len(exp_list)} experiencias ({snap['total_experience_years']} años acumulados)."]
        exp_actions = (
            ["Redacta tus funciones con verbos de acción y métricas (ej. 'Optimicé...', 'Reduje en 20%...')."]
            if detailed < len(exp_list)
            else ["Mantén actualizada tu experiencia más reciente con tecnologías y logros clave."]
        )
    elif len(exp_list) == 1:
        exp_score = 62
        exp_findings = ["Cuentas con 1 experiencia laboral registrada."]
        exp_actions = ["Incluye prácticas profesionales, monitorías o proyectos aplicados para fortalecer tu trayectoria."]
    else:
        exp_score = 28
        exp_findings = ["Aún no registras experiencias laborales o prácticas profesionales."]
        exp_actions = ["Registra tus prácticas universitarias, semilleros de investigación o voluntariados."]

    edu_list = snap["education"]
    edu_score = 90 if len(edu_list) >= 1 else 65
    edu_findings = (
        [f"Formación en {snap['program_name']} (Cohorte {snap['graduation_year']}) y {len(edu_list)} registro(s) académico(s)."]
        if edu_list
        else [f"Egresado de {snap['program_name']} ({snap['graduation_year']}), sin historial académico detallado."]
    )
    edu_actions = (
        ["Agrega diplomados, cursos de profundización o reconocimientos académicos."]
        if len(edu_list) < 2
        else ["Tu sección académica está bien documentada."]
    )

    skills_list = snap["skills"]
    if len(skills_list) >= 6:
        skills_score = 92
        skills_findings = [f"Tienes {len(skills_list)} habilidades registradas, lo que favorece el motor de matchmaking."]
        skills_actions = ["Verifica que tus habilidades principales tengan nivel 'Intermedio' o 'Avanzado'."]
    elif len(skills_list) >= 3:
        skills_score = 66
        skills_findings = [f"Cuentas con {len(skills_list)} habilidades; el promedio de perfiles competitivos es de 6 a 10."]
        skills_actions = ["Añade al menos 3 competencias técnicas o herramientas propias de tu programa."]
    else:
        skills_score = 30
        skills_findings = ["Tienes muy pocas habilidades registradas; esto reduce tu puntaje de afinidad en vacantes."]
        skills_actions = ["Agrega entre 5 y 8 habilidades clave desde las sugerencias inferiores con un clic."]

    proj_list = snap["projects"]
    if len(proj_list) >= 2:
        proj_score = 88
        proj_findings = [f"Destacas con {len(proj_list)} proyectos en tu portafolio."]
        proj_actions = ["Asegúrate de incluir enlaces verificables (GitHub, Drive, Behance o demo en vivo)."]
    elif len(proj_list) == 1:
        proj_score = 65
        proj_findings = ["Tienes 1 proyecto publicado en tu portafolio."]
        proj_actions = ["Agrega tu proyecto de grado o un caso práctico adicional con tecnologías utilizadas."]
    else:
        proj_score = 32
        proj_findings = ["Tu portafolio de proyectos está vacío."]
        proj_actions = ["Publica al menos 1 proyecto académico o profesional para demostrar tus competencias prácticas."]

    cert_list = snap["certifications"]
    if len(cert_list) >= 2:
        cert_score = 88
        cert_findings = [f"Cuentas con {len(cert_list)} certificaciones verificables."]
        cert_actions = ["Prioriza certificaciones vigentes de alto reconocimiento en tu sector."]
    elif len(cert_list) == 1:
        cert_score = 68
        cert_findings = ["Registras 1 certificación complementaria."]
        cert_actions = ["Suma una certificación adicional alineada con las vacantes de tu interés."]
    else:
        cert_score = 38
        cert_findings = ["No has registrado certificaciones ni cursos cortos."]
        cert_actions = ["Añade certificaciones (SENA, Coursera, AWS, Google, diplomados UPC) para respaldar tus habilidades."]

    vis_points = 30
    if snap["has_cv"]:
        vis_points += 30
    if snap["has_picture"]:
        vis_points += 15
    if snap["phone"]:
        vis_points += 10
    if snap["directory_visible"]:
        vis_points += 15
    vis_score = min(100, vis_points)
    vis_findings = []
    vis_actions = []
    if not snap["has_cv"]:
        vis_findings.append("No has subido tu hoja de vida en PDF.")
        vis_actions.append("Sube tu CV en PDF para habilitar postulaciones rápidas y análisis documental.")
    else:
        vis_findings.append("Hoja de vida en PDF cargada correctamente.")
    if not snap["has_picture"]:
        vis_actions.append("Sube una foto profesional para aumentar la confianza en el directorio.")
    if not vis_actions:
        vis_actions.append("Tu visibilidad y datos de contacto están completos.")

    sections = [
        {
            "key": "summary",
            "label": "Resumen Profesional",
            "score": summary_score,
            "status": _status_for_score(summary_score),
            "findings": summary_findings,
            "actions": summary_actions,
        },
        {
            "key": "experience",
            "label": "Experiencia Laboral",
            "score": exp_score,
            "status": _status_for_score(exp_score),
            "findings": exp_findings,
            "actions": exp_actions,
        },
        {
            "key": "skills",
            "label": "Habilidades y Matchmaking",
            "score": skills_score,
            "status": _status_for_score(skills_score),
            "findings": skills_findings,
            "actions": skills_actions,
        },
        {
            "key": "projects",
            "label": "Portafolio de Proyectos",
            "score": proj_score,
            "status": _status_for_score(proj_score),
            "findings": proj_findings,
            "actions": proj_actions,
        },
        {
            "key": "certifications",
            "label": "Certificaciones",
            "score": cert_score,
            "status": _status_for_score(cert_score),
            "findings": cert_findings,
            "actions": cert_actions,
        },
        {
            "key": "education",
            "label": "Historial Académico",
            "score": edu_score,
            "status": _status_for_score(edu_score),
            "findings": edu_findings,
            "actions": edu_actions,
        },
        {
            "key": "visibility",
            "label": "Visibilidad y Hoja de Vida",
            "score": vis_score,
            "status": _status_for_score(vis_score),
            "findings": vis_findings,
            "actions": vis_actions,
        },
    ]

    weights = {
        "summary": 0.18,
        "experience": 0.22,
        "skills": 0.22,
        "projects": 0.12,
        "certifications": 0.10,
        "education": 0.08,
        "visibility": 0.08,
    }
    overall_score = int(round(sum(s["score"] * weights[s["key"]] for s in sections)))
    level = _level_for_score(overall_score)

    role_focus = target_role.strip() if target_role else f"Profesional en {snap['program_name']}"
    top_skill_names = [s["name"] for s in skills_list[:3]]
    skills_phrase = ", ".join(top_skill_names) if top_skill_names else "gestión de proyectos, análisis y trabajo colaborativo"

    suggested_headline = f"{snap['program_name']} | {role_focus}" + (
        f" · {', '.join(top_skill_names[:2])}" if top_skill_names else ""
    )

    exp_phrase = (
        f"con {snap['total_experience_years']} años de experiencia práctica"
        if snap["total_experience_years"] > 0
        else f"egresado de la cohorte {snap['graduation_year']} con sólida formación aplicada"
    )
    improved_summary = (
        f"Egresado de {snap['program_name']} de la Universidad Popular del Cesar ({snap['graduation_year']}), "
        f"{exp_phrase} y enfoque en {role_focus}. "
        f"Cuento con competencias en {skills_phrase}, orientadas a la resolución de problemas, "
        f"mejora continua y entrega de resultados medibles en equipos multidisciplinarios."
    )

    prog_lower = snap["program_name"].lower()
    candidate_pool = PROGRAM_DEFAULT_SKILLS["default"]
    for key, pool in PROGRAM_DEFAULT_SKILLS.items():
        if key in prog_lower:
            candidate_pool = pool
            break

    existing_skill_names = {s["name"].lower() for s in skills_list}
    skills_to_add = [
        item for item in candidate_pool if item["name"].lower() not in existing_skill_names
    ][:4]
    if not skills_to_add:
        skills_to_add = [
            item for item in PROGRAM_DEFAULT_SKILLS["default"]
            if item["name"].lower() not in existing_skill_names
        ][:3]

    quick_wins = []
    for sec in sorted(sections, key=lambda x: x["score"])[:3]:
        quick_wins.append({
            "title": f"Fortalecer {sec['label']}",
            "detail": sec["actions"][0] if sec["actions"] else "Completa esta sección para subir tu puntaje.",
            "impact": "high" if sec["score"] < 55 else "medium",
            "section": sec["key"],
        })

    keywords = list(dict.fromkeys(
        [snap["program_name"]]
        + ([target_role] if target_role else [])
        + [s["name"] for s in skills_list[:4]]
        + [s["name"] for s in skills_to_add[:3]]
    ))[:8]

    plan_30_days = [
        {
            "week": 1,
            "goal": "Optimización de impacto y resumen ejecutivo",
            "tasks": [
                "Actualizar el resumen profesional con tu propuesta de valor y rol objetivo.",
                "Subir tu hoja de vida en PDF actualizada y verificar tu disponibilidad.",
            ],
        },
        {
            "week": 2,
            "goal": "Alineación con el motor de Matchmaking",
            "tasks": [
                "Registrar al menos 6 habilidades técnicas y transversales con su nivel de dominio.",
                "Reescribir tus experiencias laborales utilizando la metodología STAR.",
            ],
        },
        {
            "week": 3,
            "goal": "Evidencia práctica y portafolio",
            "tasks": [
                "Publicar 1 o 2 proyectos destacados con descripción de tecnologías y resultados.",
                "Registrar certificaciones o cursos recientes.",
            ],
        },
        {
            "week": 4,
            "goal": "Estrategia activa de postulación",
            "tasks": [
                "Postular a las 3 vacantes con mayor porcentaje de afinidad en el portal.",
                "Revisar la Radiografía de Competencia en Vivo para cubrir brechas específicas.",
            ],
        },
    ]

    return {
        "source": "heuristic",
        "model": None,
        "generated_at": _now_iso(),
        "overall_score": overall_score,
        "level": level,
        "headline": f"Tu perfil se encuentra en nivel {level} ({overall_score}/100) para roles de {role_focus}.",
        "suggested_headline": suggested_headline,
        "sections": sections,
        "quick_wins": quick_wins,
        "improved_summary": improved_summary,
        "skills_to_add": skills_to_add,
        "keywords": keywords,
        "plan_30_days": plan_30_days,
    }


def analyze_graduate_profile(db: Session, graduate_id: int, target_role: Optional[str] = None) -> Dict[str, Any]:
    snap = _gather_profile_snapshot(db, graduate_id)
    base = _build_heuristic_analysis(snap, target_role=target_role)

    cache_k = ai_client.cache_key("grad_analyze_v1", graduate_id, target_role or "", snap["profile_summary"], len(snap["skills"]), len(snap["experiences"]))
    cached = ai_client.cache_get(cache_k)
    if cached:
        return cached

    if not ai_client.is_enabled():
        return base

    try:
        ai_client.check_rate_limit(f"grad_ai_{graduate_id}", max_calls=20, window_seconds=600)
    except ai_client.AIRateLimited as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    system_prompt = (
        "Eres el Copiloto IA de Empleabilidad de la Universidad Popular del Cesar (UPC), Colombia. "
        "Evalúas perfiles de egresados universitarios en español profesional colombiano. "
        + ai_client.INJECTION_GUARD
        + "\nDevuelve un JSON con las claves exactas: "
        "headline (string), suggested_headline (string), improved_summary (string en primera persona, 3-4 oraciones sin inventar empresas ni títulos no presentes), "
        "quick_wins (lista de 3 objetos {title, detail, impact: 'high'|'medium'|'low', section}), "
        "skills_to_add (lista de 4 objetos {name, reason}), "
        "keywords (lista de 6-8 strings ATS), "
        "plan_30_days (lista de 4 objetos {week: 1..4, goal, tasks: [2 strings]})."
    )

    user_prompt = (
        f"Rol objetivo: {target_role or 'Acorde a su programa académico'}\n"
        f"Puntaje calculado actual: {base['overall_score']}/100 ({base['level']})\n"
        f"Datos del perfil:\n{ai_client.untrusted(str(snap))}"
    )

    try:
        llm_data = ai_client.chat_json(system_prompt, user_prompt, temperature=0.35, max_tokens=1600)
        result = {
            **base,
            "source": "groq",
            "model": ai_client.model_name(False),
            "generated_at": _now_iso(),
            "headline": str(llm_data.get("headline") or base["headline"]),
            "suggested_headline": str(llm_data.get("suggested_headline") or base["suggested_headline"]),
            "improved_summary": str(llm_data.get("improved_summary") or base["improved_summary"]),
            "quick_wins": llm_data.get("quick_wins") if isinstance(llm_data.get("quick_wins"), list) and llm_data.get("quick_wins") else base["quick_wins"],
            "skills_to_add": llm_data.get("skills_to_add") if isinstance(llm_data.get("skills_to_add"), list) and llm_data.get("skills_to_add") else base["skills_to_add"],
            "keywords": llm_data.get("keywords") if isinstance(llm_data.get("keywords"), list) and llm_data.get("keywords") else base["keywords"],
            "plan_30_days": llm_data.get("plan_30_days") if isinstance(llm_data.get("plan_30_days"), list) and llm_data.get("plan_30_days") else base["plan_30_days"],
        }
        ai_client.cache_set(cache_k, result, ttl_seconds=600)
        return result
    except ai_client.AIUnavailable:
        return base


def rewrite_profile_text(
    db: Session,
    graduate_id: int,
    field: str,
    text: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    snap = _gather_profile_snapshot(db, graduate_id)
    clean_text = (text or "").strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Debes proporcionar un texto base para mejorar")

    ctx = context or {}
    field_key = (field or "summary").strip().lower()

    # Heuristic fallback
    position = ctx.get("position") or ctx.get("job_title") or f"profesional en {snap['program_name']}"
    company = ctx.get("company") or "la organización"
    if field_key == "experience":
        heuristic_improved = (
            f"Lideré y ejecuté actividades clave como {position} en {company}, "
            f"aplicando mejores prácticas de {snap['program_name']}. "
            f"{clean_text.rstrip('.')} — logrando optimizar tiempos de entrega en un [añadir %] y fortaleciendo la calidad del servicio."
        )
    elif field_key == "cover_letter":
        heuristic_improved = (
            f"Estimado equipo de selección,\n\n"
            f"Como egresado de {snap['program_name']} de la Universidad Popular del Cesar ({snap['graduation_year']}), "
            f"presento mi postulación a la vacante de {position}. {clean_text}\n\n"
            f"Aporto compromiso, adaptabilidad y enfoque en resultados medibles. Agradezco la oportunidad de ampliar mi perfil en una entrevista."
        )
    elif field_key == "project":
        heuristic_improved = (
            f"Desarrollé e implementé este proyecto enfocado en resolver una necesidad real mediante herramientas de {snap['program_name']}. "
            f"{clean_text.rstrip('.')}, alcanzando resultados verificables y documentados."
        )
    elif field_key == "headline":
        heuristic_improved = f"{snap['program_name']} | {clean_text[:90]}"
    else:
        heuristic_improved = (
            f"Profesional en {snap['program_name']} (UPC, {snap['graduation_year']}) con enfoque en resultados y mejora continua. "
            f"{clean_text.rstrip('.')}. Destaco por mi capacidad analítica, trabajo colaborativo y orientación al logro."
        )

    fallback = {
        "source": "heuristic",
        "model": None,
        "generated_at": _now_iso(),
        "original": clean_text,
        "improved": heuristic_improved,
        "changes": [
            "Se estructuró la redacción con verbos de acción de alto impacto.",
            "Se alineó el tono con estándares de selección ejecutiva y filtros ATS.",
        ],
        "warnings": [
            "Si el texto incluye marcadores como [añadir %], reemplázalos con un indicador real antes de guardar."
        ],
    }

    if not ai_client.is_enabled():
        return fallback

    try:
        ai_client.check_rate_limit(f"grad_ai_{graduate_id}", max_calls=20, window_seconds=600)
    except ai_client.AIRateLimited as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    system_prompt = (
        "Eres un experto redactor de currículums y coach de empleabilidad con metodología STAR (Situación, Tarea, Acción, Resultado). "
        "Reescribe el texto del egresado en español profesional, claro y persuasivo. "
        "Si faltan cifras o métricas, inserta un marcador explícito como [añadir métrica] y menciónalo en warnings; nunca inventes hechos falsos. "
        + ai_client.INJECTION_GUARD
        + "\nDevuelve un JSON con: improved (string), changes (lista de 2-4 strings), warnings (lista de strings)."
    )
    user_prompt = (
        f"Campo a reescribir: {field_key}\n"
        f"Programa del egresado: {snap['program_name']} ({snap['graduation_year']})\n"
        f"Contexto adicional: {ctx}\n"
        f"Texto original:\n{ai_client.untrusted(clean_text)}"
    )

    try:
        data = ai_client.chat_json(system_prompt, user_prompt, temperature=0.4, max_tokens=1000)
        return {
            "source": "groq",
            "model": ai_client.model_name(False),
            "generated_at": _now_iso(),
            "original": clean_text,
            "improved": str(data.get("improved") or fallback["improved"]),
            "changes": data.get("changes") if isinstance(data.get("changes"), list) and data.get("changes") else fallback["changes"],
            "warnings": data.get("warnings") if isinstance(data.get("warnings"), list) else fallback["warnings"],
        }
    except ai_client.AIUnavailable:
        return fallback


def chat_with_coach(db: Session, graduate_id: int, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    snap = _gather_profile_snapshot(db, graduate_id)
    cleaned_msgs: List[Dict[str, str]] = []
    for m in (messages or [])[-12:]:
        role = m.get("role") if m.get("role") in ("user", "assistant") else "user"
        content = (m.get("content") or "").strip()[:1500]
        if content:
            cleaned_msgs.append({"role": role, "content": content})

    if not cleaned_msgs or cleaned_msgs[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="El último mensaje debe ser del usuario")

    last_user_msg = cleaned_msgs[-1]["content"].lower()
    skill_names = ", ".join(s["name"] for s in snap["skills"][:5]) or "ninguna registrada aún"

    # Respuesta heurística inteligente según la intención
    if "entrevista" in last_user_msg:
        reply = (
            f"Para destacar en tus entrevistas como egresado de **{snap['program_name']}**, te recomiendo:\n\n"
            f"1. **Estructura STAR**: Prepara 3 historias concretas sobre retos resueltos en tus experiencias ({len(snap['experiences'])} registradas) o proyectos ({len(snap['projects'])} registrados).\n"
            f"2. **Domina tus habilidades clave**: Conecta tus competencias ({skill_names}) con las necesidades reales de la vacante.\n"
            f"3. **Preguntas estratégicas**: Al cierre, consulta sobre los indicadores de éxito del rol en los primeros 90 días."
        )
    elif "salario" in last_user_msg or "sueldo" in last_user_msg:
        sal_str = f"${snap['expected_salary']:,} COP" if snap.get("expected_salary") else "aún no definido en tu perfil"
        reply = (
            f"Actualmente tu aspiración salarial en el portal es **{sal_str}**. "
            f"Para negociar con respaldo:\n\n"
            f"- Consulta el **Mapa de Calor de Cohortes** del portal para ver el salario promedio real de **{snap['program_name']}**.\n"
            f"- Da un rango salarial en lugar de una cifra cerrada y destaca tus certificaciones ({len(snap['certifications'])}) y experiencia ({snap['total_experience_years']} años)."
        )
    else:
        reply = (
            f"¡Hola {snap['first_name']}! Analizando tu perfil de **{snap['program_name']}** (Cohorte {snap['graduation_year']}):\n\n"
            f"- **Fortalezas actuales**: {len(snap['skills'])} habilidades ({skill_names}), {len(snap['experiences'])} experiencia(s) y {len(snap['projects'])} proyecto(s).\n"
            f"- **Siguiente paso de mayor impacto**: {'Ampliar tu resumen profesional a 3-4 líneas con logros medibles.' if len(snap['profile_summary']) < 120 else 'Añadir métricas de impacto en tus experiencias y postular a vacantes con afinidad >75%.'}\n\n"
            f"¿Quieres que preparemos preguntas de entrevista, mejoremos una experiencia o revisemos qué habilidades te darían más puntaje de matchmaking?"
        )

    suggestions = [
        "¿Cómo respondo preguntas difíciles en una entrevista?",
        "¿Qué habilidades debo agregar para subir mi afinidad?",
        "Ayúdame a redactar un logro con metodología STAR",
    ]

    if not ai_client.is_enabled():
        return {
            "source": "heuristic",
            "model": None,
            "generated_at": _now_iso(),
            "reply": reply,
            "suggestions": suggestions,
        }

    try:
        ai_client.check_rate_limit(f"grad_ai_{graduate_id}", max_calls=25, window_seconds=600)
    except ai_client.AIRateLimited as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    system_prompt = (
        "Eres el Copiloto IA de Empleabilidad de la Universidad Popular del Cesar (UPC). "
        "Asesoras al egresado de forma cercana, práctica, concisa y estructurada en español. "
        "Usa únicamente los datos reales de su perfil para personalizar tus consejos. "
        + ai_client.INJECTION_GUARD
        + f"\nPerfil actual del egresado: Programa={snap['program_name']}, Cohorte={snap['graduation_year']}, "
        f"Experiencia={snap['total_experience_years']} años, Habilidades={skill_names}, "
        f"Proyectos={len(snap['projects'])}, Certificaciones={len(snap['certifications'])}, "
        f"CV cargado={'Sí' if snap['has_cv'] else 'No'}."
    )

    try:
        llm_reply = ai_client.chat_text(system_prompt, cleaned_msgs, temperature=0.45, max_tokens=700)
        return {
            "source": "groq",
            "model": ai_client.model_name(False),
            "generated_at": _now_iso(),
            "reply": llm_reply or reply,
            "suggestions": suggestions,
        }
    except ai_client.AIUnavailable:
        return {
            "source": "heuristic",
            "model": None,
            "generated_at": _now_iso(),
            "reply": reply,
            "suggestions": suggestions,
        }

