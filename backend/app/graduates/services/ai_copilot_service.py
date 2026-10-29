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
        llm_data = ai_client.chat_json(system_prompt, user_prompt, temperature=0.35, max_tokens=2600)
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
        data = ai_client.chat_json(system_prompt, user_prompt, temperature=0.4, max_tokens=2000)
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


WELCOME_COACH_MESSAGE = (
    "¡Hola! Soy tu **Copiloto IA de Empleabilidad UPC**. "
    "Tengo acceso en tiempo real a tu expediente, a tus postulaciones y al **catálogo de vacantes activas del portal** "
    "(bajo estricta protección de datos personales de terceros). ¿Qué aspecto de tu carrera o búsqueda laboral impulsamos hoy?"
)

_COACH_TABLES_READY = False


def _ensure_coach_tables(db: Session) -> None:
    global _COACH_TABLES_READY
    if _COACH_TABLES_READY:
        return
    try:
        from sqlalchemy import text
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_coach_sessions (
                id SERIAL PRIMARY KEY,
                graduate_id INTEGER NOT NULL REFERENCES graduates(user_id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL DEFAULT 'Nueva conversación',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_coach_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES ai_coach_sessions(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.commit()
        _COACH_TABLES_READY = True
    except Exception:
        db.rollback()


def _serialize_session(session: models.AICoachSession, include_messages: bool = False) -> Dict[str, Any]:
    msgs = list(session.messages or [])
    last_preview = ""
    for m in reversed(msgs):
        if m.role == "user" and m.content:
            last_preview = m.content[:90]
            break
    if not last_preview and msgs:
        last_preview = (msgs[-1].content or "").replace("**", "")[:90]

    payload: Dict[str, Any] = {
        "id": session.id,
        "graduate_id": session.graduate_id,
        "title": session.title or "Conversación con Coach IA",
        "created_at": session.created_at.isoformat() if session.created_at else _now_iso(),
        "updated_at": session.updated_at.isoformat() if session.updated_at else _now_iso(),
        "message_count": len(msgs),
        "last_message_preview": last_preview,
    }
    if include_messages:
        payload["messages"] = [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else _now_iso(),
            }
            for m in msgs
        ]
    return payload


def list_coach_sessions(db: Session, graduate_id: int) -> List[Dict[str, Any]]:
    _ensure_coach_tables(db)
    sessions = (
        db.query(models.AICoachSession)
        .filter(models.AICoachSession.graduate_id == graduate_id)
        .order_by(models.AICoachSession.updated_at.desc(), models.AICoachSession.id.desc())
        .all()
    )
    if not sessions:
        created = create_coach_session(db, graduate_id, title="Estrategia y Vacantes UPC")
        return [created]
    return [_serialize_session(s, include_messages=False) for s in sessions]


def create_coach_session(db: Session, graduate_id: int, title: Optional[str] = None) -> Dict[str, Any]:
    _ensure_coach_tables(db)
    clean_title = (title or "").strip()[:180] or "Nueva conversación"
    session = models.AICoachSession(
        graduate_id=graduate_id,
        title=clean_title,
    )
    db.add(session)
    db.flush()
    welcome = models.AICoachMessage(
        session_id=session.id,
        role="assistant",
        content=WELCOME_COACH_MESSAGE,
    )
    db.add(welcome)
    db.commit()
    db.refresh(session)
    return _serialize_session(session, include_messages=True)


def get_coach_session(db: Session, graduate_id: int, session_id: int) -> Dict[str, Any]:
    _ensure_coach_tables(db)
    session = (
        db.query(models.AICoachSession)
        .filter(
            models.AICoachSession.id == session_id,
            models.AICoachSession.graduate_id == graduate_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return _serialize_session(session, include_messages=True)


def delete_coach_session(db: Session, graduate_id: int, session_id: int) -> Dict[str, Any]:
    _ensure_coach_tables(db)
    session = (
        db.query(models.AICoachSession)
        .filter(
            models.AICoachSession.id == session_id,
            models.AICoachSession.graduate_id == graduate_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    db.delete(session)
    db.commit()
    remaining = list_coach_sessions(db, graduate_id)
    active = get_coach_session(db, graduate_id, remaining[0]["id"])
    return {"deleted_id": session_id, "sessions": remaining, "active_session": active}


def _gather_system_context_for_coach(db: Session, graduate_id: int, snap: Dict[str, Any]) -> Dict[str, Any]:
    """
    Obtiene información autorizada en tiempo real del ecosistema del portal:
    1. Vacantes activas públicas (cargo, empresa, ciudad, modalidad, rango salarial, habilidades requeridas y % afinidad).
    2. Postulaciones propias del egresado autenticado (NUNCA de otros egresados).
    3. Estadísticas agregadas anónimas del portal (total egresados, total en su programa, mentores activos).
    """
    cache_k = ai_client.cache_key("coach_sys_ctx_v1", graduate_id, snap.get("program_id"), len(snap.get("skills", [])))
    cached = ai_client.cache_get(cache_k)
    if cached:
        return cached

    import os
    import urllib.request
    import json as _json

    companies_url = os.getenv("COMPANIES_URL", "http://companies:8000").rstrip("/")
    grad_skill_names = {s["name"].strip().lower() for s in (snap.get("skills") or []) if s.get("name")}
    grad_program_id = snap.get("program_id")
    grad_exp_years = float(snap.get("total_experience_years") or 0)

    active_jobs_raw: List[Dict[str, Any]] = []
    my_apps_raw: List[Dict[str, Any]] = []

    # 1. Consultar vacantes activas vía microservicio companies
    try:
        req = urllib.request.Request(f"{companies_url}/api/internal/jobs?limit=60", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            data = _json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list):
                active_jobs_raw = data
    except Exception:
        pass

    # 2. Consultar postulaciones y filtrar ESTRICTAMENTE las del egresado actual
    try:
        req = urllib.request.Request(f"{companies_url}/api/internal/applications", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            apps_data = _json.loads(resp.read().decode("utf-8"))
            if isinstance(apps_data, list):
                for a in apps_data:
                    if isinstance(a, dict) and a.get("graduate_id") == graduate_id:
                        job_obj = a.get("job_offer") or {}
                        comp_obj = job_obj.get("company") or {}
                        my_apps_raw.append({
                            "application_id": a.get("id"),
                            "job_offer_id": a.get("job_offer_id"),
                            "job_title": job_obj.get("title") or f"Vacante #{a.get('job_offer_id')}",
                            "company_name": comp_obj.get("name") or "Empresa Aliada UPC",
                            "status": a.get("status") or "POSTULADO",
                            "application_date": str(a.get("application_date") or "")[:10],
                            "rejection_reason": a.get("rejection_reason"),
                        })
    except Exception:
        pass

    # Mapa id -> nombre de habilidades (la API de vacantes sólo expone skill_id)
    skill_name_by_id: Dict[int, str] = {}
    try:
        for sk_row in db.query(models.Skill).all():
            skill_name_by_id[sk_row.id] = sk_row.name
    except Exception:
        pass

    # Formatear vacantes activas y calcular afinidad estimada con el egresado
    formatted_jobs: List[Dict[str, Any]] = []
    for j in active_jobs_raw:
        if not isinstance(j, dict):
            continue
        comp = j.get("company") or {}
        city_obj = comp.get("city") or {}
        sector_obj = comp.get("sector") or {}
        req_skills_objs = j.get("skills") or []
        req_skill_names = []
        for rs in req_skills_objs:
            if isinstance(rs, dict):
                sk_info = rs.get("skill") or {}
                sk_name = (
                    sk_info.get("name")
                    or rs.get("skill_name")
                    or skill_name_by_id.get(rs.get("skill_id"))
                )
                if sk_name:
                    req_skill_names.append(str(sk_name))

        # Cálculo rápido de afinidad para orientar al egresado
        score = 45
        if j.get("program_id") == grad_program_id:
            score += 25
        if req_skill_names:
            matched = sum(1 for r in req_skill_names if r.strip().lower() in grad_skill_names)
            score += int(round((matched / max(1, len(req_skill_names))) * 22))
        elif grad_skill_names:
            score += 12
        min_exp = float(j.get("min_experience_years") or 0)
        if grad_exp_years >= min_exp:
            score += 8
        affinity_pct = min(98, max(35, score))

        sal_min = j.get("salary_min")
        sal_max = j.get("salary_max")
        if sal_min and sal_max:
            salary_label = f"${int(sal_min):,} - ${int(sal_max):,} COP"
        elif sal_min:
            salary_label = f"Desde ${int(sal_min):,} COP"
        else:
            salary_label = "A convenir"

        formatted_jobs.append({
            "id": j.get("id"),
            "title": j.get("title") or "Vacante Profesional",
            "company_name": comp.get("name") or "Empresa Aliada",
            "city": city_obj.get("name") or "Valledupar / Colombia",
            "sector": sector_obj.get("name") or "Empresarial",
            "modality": j.get("modality") or "Presencial",
            "contract_type": j.get("contract_type") or "Indefinido",
            "salary_range": salary_label,
            "min_experience_years": int(min_exp),
            "program_id": j.get("program_id"),
            "matches_my_program": bool(j.get("program_id") == grad_program_id),
            "required_skills": req_skill_names[:6],
            "affinity_pct": affinity_pct,
        })

    # Ordenar primero las vacantes del mismo programa y mayor afinidad
    formatted_jobs.sort(key=lambda x: (1 if x["matches_my_program"] else 0, x["affinity_pct"]), reverse=True)

    # 3. Estadísticas agregadas anónimas del portal (CERO datos personales de otros egresados)
    total_graduates = 0
    same_program_graduates = 0
    active_mentors = 0
    try:
        total_graduates = db.query(models.Graduate).count()
        same_program_graduates = db.query(models.Graduate).filter(models.Graduate.program_id == grad_program_id).count()
        active_mentors = db.query(models.Graduate).filter(models.Graduate.mentor_opt_in == True).count()
    except Exception:
        pass

    ctx_result = {
        "total_active_jobs": len(formatted_jobs),
        "top_matched_jobs": formatted_jobs[:12],
        "my_applications": my_apps_raw[:10],
        "portal_stats_anonymous": {
            "total_graduates_registered": total_graduates,
            "graduates_in_my_program": same_program_graduates,
            "active_mentors_in_network": active_mentors,
        },
    }
    ai_client.cache_set(cache_k, ctx_result, ttl_seconds=45)
    return ctx_result


def chat_with_coach(
    db: Session,
    graduate_id: int,
    messages: List[Dict[str, str]],
    session_id: Optional[int] = None,
) -> Dict[str, Any]:
    _ensure_coach_tables(db)
    snap = _gather_profile_snapshot(db, graduate_id)
    sys_ctx = _gather_system_context_for_coach(db, graduate_id, snap)

    cleaned_msgs: List[Dict[str, str]] = []
    for m in (messages or [])[-12:]:
        role = m.get("role") if m.get("role") in ("user", "assistant") else "user"
        content = (m.get("content") or "").strip()[:1500]
        if content:
            cleaned_msgs.append({"role": role, "content": content})

    if not cleaned_msgs or cleaned_msgs[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="El último mensaje debe ser del usuario")

    user_prompt_text = cleaned_msgs[-1]["content"]
    last_user_msg = user_prompt_text.lower()
    skill_names = ", ".join(s["name"] for s in snap["skills"][:5]) or "ninguna registrada aún"
    prog_lower = snap["program_name"].lower()
    rec_pool = PROGRAM_DEFAULT_SKILLS["default"]
    for k, pool in PROGRAM_DEFAULT_SKILLS.items():
        if k in prog_lower:
            rec_pool = pool
            break
    existing_lower = {s["name"].lower() for s in snap["skills"]}
    missing_skills = [p["name"] for p in rec_pool if p["name"].lower() not in existing_lower][:4]
    missing_str = ", ".join(missing_skills) if missing_skills else "Inglés Técnico, Gestión de Proyectos, Liderazgo Ágil"

    # Resolver o crear la sesión persistente en PostgreSQL para sincronizar Web y Móvil
    session_obj: Optional[models.AICoachSession] = None
    if session_id:
        session_obj = (
            db.query(models.AICoachSession)
            .filter(
                models.AICoachSession.id == session_id,
                models.AICoachSession.graduate_id == graduate_id,
            )
            .first()
        )
    if not session_obj:
        session_obj = (
            db.query(models.AICoachSession)
            .filter(models.AICoachSession.graduate_id == graduate_id)
            .order_by(models.AICoachSession.updated_at.desc(), models.AICoachSession.id.desc())
            .first()
        )
    if not session_obj:
        created_dict = create_coach_session(db, graduate_id)
        session_obj = db.query(models.AICoachSession).filter(models.AICoachSession.id == created_dict["id"]).first()

    # Si existen mensajes guardados en la sesión y el cliente sólo envió 1 mensaje nuevo, reconstruir contexto
    if session_obj and len(cleaned_msgs) <= 2 and len(session_obj.messages) > 1:
        persisted_history = [
            {"role": pm.role, "content": pm.content[:1500]}
            for pm in session_obj.messages[-10:]
        ]
        cleaned_msgs = persisted_history + [{"role": "user", "content": user_prompt_text}]

    # Pool completo de sugerencias dinámicas incluyendo consultas al sistema en vivo
    all_suggestions = [
        "¿Qué vacantes activas hay en el portal para mi perfil?",
        "¿Cuál es el estado actual de mis postulaciones?",
        "¿Qué habilidades me recomiendas agregar según mi carrera?",
        "Ayúdame a redactar un logro con metodología STAR",
        "¿Cómo respondo preguntas difíciles en una entrevista?",
        "¿Cómo negocio mi salario para mi primer o próximo empleo?",
        "¿Qué proyectos puedo publicar en mi portafolio para destacar?",
        "¿Cómo optimizo mi resumen profesional para pasar filtros ATS?",
    ]
    asked_lower = {m["content"].strip().lower() for m in cleaned_msgs if m["role"] == "user"}

    top_jobs = sys_ctx.get("top_matched_jobs") or []
    my_apps = sys_ctx.get("my_applications") or []
    anon_stats = sys_ctx.get("portal_stats_anonymous") or {}

    # 1. Guardia de privacidad si preguntan por datos privados de otros egresados
    if any(w in last_user_msg for w in ("otros egresados", "otro egresado", "telefono de", "correo de", "cedula", "hoja de vida de otro", "datos personales de", "quienes se postularon")):
        reply = (
            f"🔒 **Política de Privacidad y Protección de Datos (Ley 1581 de 2012 - Habeas Data)**\n\n"
            f"Como Copiloto IA institucional tengo acceso al sistema, pero **tengo estrictamente restringido compartir datos personales o confidenciales de otros egresados** "
            f"(como nombres privados, teléfonos, correos, hojas de vida o procesos de selección de terceros).\n\n"
            f"Sin embargo, sí puedo compartirte **indicadores agregados y anónimos en tiempo real** del portal:\n"
            f"- **Egresados registrados en el portal**: `{anon_stats.get('total_graduates_registered', 0)}` profesionales.\n"
            f"- **Colegas de tu programa ({snap['program_name']})**: `{anon_stats.get('graduates_in_my_program', 0)}` egresados.\n"
            f"- **Mentores activos en la red UPC**: `{anon_stats.get('active_mentors_in_network', 0)}` mentores disponibles.\n"
            f"- **Vacantes activas hoy**: `{sys_ctx.get('total_active_jobs', 0)}` ofertas laborales abiertas."
        )
    # 2. Consulta en vivo de vacantes del portal
    elif any(w in last_user_msg for w in ("vacante", "oferta", "empleo", "portal", "acceso", "trabajo disponible", "empresas", "convocatoria", "puesto")):
        if top_jobs:
            table_rows = "\n".join(
                f"| **{j['title']}** | {j['company_name']} ({j['city']}) | {j['modality']} | {j['salary_range']} | **{j['affinity_pct']}%** |"
                for j in top_jobs[:6]
            )
            reply = (
                f"¡Sí, {snap['first_name']}! Tengo acceso en tiempo real al catálogo de ofertas del portal. "
                f"Actualmente hay **{sys_ctx.get('total_active_jobs', len(top_jobs))} vacantes activas** y estas son las más afines a tu perfil de **{snap['program_name']}**:\n\n"
                f"| Cargo / Vacante | Empresa y Ciudad | Modalidad | Rango Salarial | Afinidad IA |\n"
                f"|---|---|---|---|---|\n"
                f"{table_rows}\n\n"
                f"### Recomendación para postular hoy\n"
                f"- **Mayor compatibilidad**: La vacante de **{top_jobs[0]['title']}** en **{top_jobs[0]['company_name']}** tiene un **{top_jobs[0]['affinity_pct']}%** de afinidad con tu perfil.\n"
                f"- **Cómo subir tu puntaje antes de postular**: Agrega en tu perfil competencias como **{missing_str}** y dirígete a **Explorar Vacantes** en el menú izquierdo para postularte en 1 clic."
            )
        else:
            reply = (
                f"Sí tengo conexión directa con el catálogo de vacantes del portal, {snap['first_name']}. "
                f"En este momento no hay ofertas activas publicadas que coincidan con el filtro, pero puedes activar tus alertas de empleo para **{snap['program_name']}**."
            )
    # 3. Consulta en vivo de las postulaciones del propio egresado
    elif any(w in last_user_msg for w in ("postulacion", "postulé", "postule", "mis procesos", "etapa", "estado de mi")):
        if my_apps:
            app_rows = "\n".join(
                f"| **{a['job_title']}** | {a['company_name']} | `{a['status']}` | {a['application_date'] or 'Reciente'} |"
                for a in my_apps[:6]
            )
            reply = (
                f"Aquí tienes el **estado en tiempo real de tus {len(my_apps)} postulación(es)** registradas en el portal:\n\n"
                f"| Vacante | Empresa | Etapa Actual | Fecha |\n"
                f"|---|---|---|---|\n"
                f"{app_rows}\n\n"
                f"- Puedes ver la comparativa anónima frente a otros candidatos abriendo la **Radiografía de Competencia en Vivo** dentro de **Mis Postulaciones**."
            )
        else:
            reply = (
                f"Revisé tu expediente en tiempo real y **aún no registras postulaciones activas** en el portal, {snap['first_name']}.\n\n"
                f"- Actualmente tienes **{sys_ctx.get('total_active_jobs', 0)} vacantes abiertas** en el sistema.\n"
                f"- Pregúntame *\"¿Qué vacantes activas hay en el portal para mi perfil?\"* y te mostraré la tabla con las mejores opciones para ti."
            )
    elif any(w in last_user_msg for w in ("curso", "internet", "plataforma", "certific", "aprender", "estudiar", "ciencia de datos", "data science", "coursera", "udemy", "platzi", "edx")):
        topic_focus = "Ciencia de Datos, Machine Learning y Analítica" if any(k in last_user_msg for k in ("datos", "data", "ia", "python", "estadistica")) else f"especialización en {snap['program_name']}"
        reply = (
            f"¡Excelente iniciativa, {snap['first_name']}! Aquí tienes los mejores **cursos de internet y certificaciones online** para fortalecer tu perfil en **{topic_focus}**:\n\n"
            f"| Curso / Certificación | Plataforma | Duración | Impacto en tu CV |\n"
            f"|---|---|---|---|\n"
            f"| **IBM Data Science Professional** | Coursera (IBM) | 6 semanas | Domina Python, SQL, análisis de datos y proyectos prácticos. |\n"
            f"| **Machine Learning Specialization** | DeepLearning.AI | 8 semanas | Fundamentos sólidos de IA y modelos predictivos. |\n"
            f"| **AWS Cloud Practitioner Essentials** | AWS Skill Builder | 3 semanas | Certificación cloud de alta demanda en empresas aliadas UPC. |\n"
            f"| **SQL & Pandas Micro-Courses** | Kaggle Learn | 2 semanas | 100% gratuito con certificado verificable para portafolio. |\n\n"
            f"💡 **Consejo para tu CV**: Apenas completes cualquiera de estos módulos, regístralo en **Certificaciones** y publica el proyecto en **Proyectos & Portafolio**."
        )
    elif any(w in last_user_msg for w in ("habilidad", "skill", "afinidad", "match", "competencia", "agregar")):
        reply = (
            f"Para subir tu puntaje de **Matchmaking** como egresado de **{snap['program_name']}** (Cohorte {snap['graduation_year']}), "
            f"analicé tus competencias actuales ({skill_names}) frente a las **{sys_ctx.get('total_active_jobs', 0)} vacantes activas del portal**:\n\n"
            f"1. **Habilidades de alto impacto que te faltan**: Agrega **{missing_str}**. Estas aparecen en más del 70% de las vacantes de tu área.\n"
            f"2. **Nivel de dominio**: Asegúrate de calibrar tus habilidades principales en nivel *Intermedio* o *Avanzado* si ya las aplicaste en proyectos o prácticas.\n"
            f"3. **Palabras clave ATS**: Incluye estas mismas tecnologías dentro de tu resumen profesional para duplicar tu relevancia algorítmica.\n\n"
            f"💡 *Tip rápido*: En la pestaña **Diagnóstico 360°** puedes agregar cualquiera de estas habilidades con **1 solo clic**."
        )
    elif any(w in last_user_msg for w in ("star", "logro", "redact", "experiencia", " práctica", "practica")):
        sample_role = snap["experiences"][0]["position"] if snap["experiences"] else f"Practicante / Analista de {snap['program_name']}"
        reply = (
            f"¡Claro, {snap['first_name']}! La metodología **STAR** transforma tareas genéricas en logros de alto impacto para un **{sample_role}**:\n\n"
            f"- **S (Situación)**: *\"Durante mi etapa en el área de {snap['program_name']}, el proceso de seguimiento y entrega presentaba cuellos de botella manuales.\"*\n"
            f"- **T (Tarea)**: *\"Asumí la responsabilidad de estandarizar y optimizar el flujo utilizando {snap['skills'][0]['name'] if snap['skills'] else 'herramientas digitales'}.\"*\n"
            f"- **A (Acción)**: *\"Diseñé e implementé una solución estructurada con controles de calidad y automatización de reportes clave.\"*\n"
            f"- **R (Resultado)**: *\"Reduje los tiempos de respuesta en un **35%** y mejoré la precisión de los entregables del equipo.\"*\n\n"
            f"Puedes pegar este borrador en la pestaña **Reescritor STAR** para adaptarlo a cualquier cargo."
        )
    elif any(w in last_user_msg for w in ("entrevista", "pregunta", "reclutador", "seleccion")):
        reply = (
            f"Para brillar en entrevistas de **{snap['program_name']}**, prepara estas 3 respuestas clave:\n\n"
            f"1. **\"Háblame de ti\" (Pitch 60s)**: *\"Soy egresado de {snap['program_name']} de la UPC ({snap['graduation_year']}), especializado en {skill_names}. Me enfoco en resolver problemas complejos con resultados medibles.\"*\n"
            f"2. **Pregunta técnica o de caso**: Conecta siempre tu respuesta con una herramienta real que domines y explica *cómo* validas la calidad de tu trabajo.\n"
            f"3. **Pregunta de cierre para el entrevistador**: *\"¿Cuál sería el principal indicador de éxito para esta posición durante los primeros 90 días?\"* — demuestra visión ejecutiva inmediata."
        )
    elif any(w in last_user_msg for w in ("salario", "sueldo", "negocia", "aspiracion", "cuanto cobrar", "pago")):
        sal_str = f"${snap['expected_salary']:,} COP" if snap.get("expected_salary") else "aún sin definir en tu perfil"
        reply = (
            f"Tu aspiración salarial registrada actualmente es **{sal_str}**. Mi recomendación estratégica para negociar en **{snap['program_name']}**:\n\n"
            f"1. **Usa rangos, no cifras fijas**: Propón una banda salarial (ej. entre `$3.2M` y `$4.2M COP` según la complejidad y modalidad del rol).\n"
            f"2. **Apóyate en datos reales**: Revisa el **Mapa de Calor de Cohortes** en el menú izquierdo para citar el promedio real de tu promoción.\n"
            f"3. **Justifica el valor**: Respalda tu expectativa mencionando tus competencias en **{skill_names}** y tu disponibilidad inmediata."
        )
    else:
        reply = (
            f"¡Excelente consulta, {snap['first_name']}! Basado en tu expediente actual de **{snap['program_name']}** (Cohorte {snap['graduation_year']}) y el sistema en vivo:\n\n"
            f"- **Estado de tu perfil**: Cuentas con **{len(snap['skills'])} habilidades** ({skill_names}), **{len(snap['experiences'])} experiencia(s)** y **{len(snap['projects'])} proyecto(s)**.\n"
            f"- **Oportunidades en el portal**: Hay **{sys_ctx.get('total_active_jobs', 0)} vacantes activas** y tienes **{len(my_apps)} postulación(es)** en curso.\n"
            f"- **Prioridad #1 hoy**: {'Ampliar tu resumen ejecutivo e incorporar al menos 4 habilidades clave (' + missing_str + ') para superar el 75% de afinidad en las vacantes activas.' if len(snap['skills']) < 5 else 'Transformar tus experiencias con métricas cuantificables (método STAR) y postular a las ofertas recomendadas.'}"
        )

    suggestions = [s for s in all_suggestions if s.strip().lower() not in asked_lower][:3]
    if len(suggestions) < 3:
        suggestions = all_suggestions[:3]

    final_reply = reply
    source_used = "heuristic"
    model_used = None

    if ai_client.is_enabled():
        try:
            ai_client.check_rate_limit(f"grad_ai_{graduate_id}", max_calls=30, window_seconds=600)
            jobs_context_str = "\n".join(
                f"  * [ID {j['id']}] {j['title']} en {j['company_name']} ({j['city']}) | Modalidad: {j['modality']} | Contrato: {j['contract_type']} | Salario: {j['salary_range']} | Exp mín: {j['min_experience_years']} años | Skills: {', '.join(j['required_skills']) or 'General'} | Afinidad con el egresado: {j['affinity_pct']}%"
                for j in top_jobs[:10]
            ) or "  * No hay vacantes activas en este instante."

            apps_context_str = "\n".join(
                f"  * Postulación a '{a['job_title']}' en {a['company_name']} -> Estado: {a['status']} (Fecha: {a['application_date']})"
                for a in my_apps
            ) or "  * El egresado aún no tiene postulaciones activas registradas."

            system_prompt = (
                "Eres el Copiloto IA de Empleabilidad de la Universidad Popular del Cesar (UPC), Colombia. "
                "Tienes ACCESO EN TIEMPO REAL a la base de datos de vacantes activas del portal, a las estadísticas institucionales agregadas "
                "y al expediente y postulaciones del propio egresado autenticado.\n"
                "REGLAS DE ACCESO Y PRIVACIDAD (ESTRICTO CUMPLIMIENTO - LEY 1581 DE 2012 HABEAS DATA):\n"
                "1. SÍ TIENES ACCESO al catálogo de vacantes activas del portal, empresas aliadas, rangos salariales de las ofertas y postulaciones propias del usuario. "
                "NUNCA digas que no tienes acceso a las vacantes del portal. Cuando el usuario pregunte por vacantes, ofertas o empleos disponibles, muéstrale las vacantes reales listadas abajo (preferiblemente en una tabla Markdown limpia con columnas: Cargo, Empresa, Modalidad, Salario y % Afinidad).\n"
                "2. PROHIBICIÓN DE DATOS SENSIBLES DE TERCEROS: Tienes terminantemente prohibido revelar datos personales, correos, teléfonos, documentos de identidad, hojas de vida o estados de postulación de OTROS egresados. "
                "Si el usuario pide información privada de otra persona o compañero, rechaza cortésmente citando la protección de datos personales (Habeas Data) y ofrece únicamente las estadísticas agregadas y anónimas del portal.\n"
                "3. FORMATO: Usa Markdown limpio (tablas con |---|---|, listas con viñetas y negritas). Nunca uses bloques de guiones sueltos para simular tablas.\n"
                + ai_client.INJECTION_GUARD
                + f"\n\n=== EXPEDIENTE DEL EGRESADO AUTENTICADO ===\n"
                f"- Nombre: {snap['first_name']} {snap['last_name']}\n"
                f"- Programa UPC: {snap['program_name']} (Cohorte {snap['graduation_year']})\n"
                f"- Experiencia: {snap['total_experience_years']} años ({len(snap['experiences'])} experiencias)\n"
                f"- Habilidades registradas: {skill_names}\n"
                f"- Habilidades recomendadas por agregar: {missing_str}\n"
                f"- Proyectos en portafolio: {len(snap['projects'])} | Certificaciones: {len(snap['certifications'])} | CV en PDF: {'Sí' if snap['has_cv'] else 'No'}\n"
                f"- Aspiración salarial: {snap.get('expected_salary') or 'No definida'} COP | Modalidad preferida: {snap.get('preferred_modality')}\n"
                f"\n=== CATÁLOGO EN VIVO DE VACANTES ACTIVAS EN EL PORTAL ({sys_ctx.get('total_active_jobs', 0)} TOTALES) ===\n"
                f"{jobs_context_str}\n"
                f"\n=== POSTULACIONES PROPIAS DEL EGRESADO ({len(my_apps)}) ===\n"
                f"{apps_context_str}\n"
                f"\n=== ESTADÍSTICAS INSTITUCIONALES ANÓNIMAS DEL PORTAL ===\n"
                f"- Total egresados en el portal: {anon_stats.get('total_graduates_registered', 0)}\n"
                f"- Egresados del programa {snap['program_name']}: {anon_stats.get('graduates_in_my_program', 0)}\n"
                f"- Mentores activos en la red: {anon_stats.get('active_mentors_in_network', 0)}\n"
            )

            llm_reply = ai_client.chat_text(system_prompt, cleaned_msgs, temperature=0.45, max_tokens=2000)
            if llm_reply:
                final_reply = llm_reply
                source_used = "groq"
                model_used = ai_client.model_name(False)
        except ai_client.AIRateLimited as exc:
            raise HTTPException(status_code=429, detail=str(exc))
        except ai_client.AIUnavailable:
            pass

    # Persistir el mensaje del usuario y la respuesta del asistente en PostgreSQL (sincronización Web <-> Móvil)
    if session_obj:
        try:
            user_msg_db = models.AICoachMessage(
                session_id=session_obj.id,
                role="user",
                content=user_prompt_text,
            )
            assistant_msg_db = models.AICoachMessage(
                session_id=session_obj.id,
                role="assistant",
                content=final_reply,
            )
            db.add(user_msg_db)
            db.add(assistant_msg_db)

            # Si el título sigue siendo el genérico, actualizarlo con el tema de la primera consulta
            if session_obj.title in ("Nueva conversación", "Estrategia y Vacantes UPC", "Conversación con Coach IA"):
                short_title = user_prompt_text.strip().replace("\n", " ")
                if len(short_title) > 48:
                    short_title = short_title[:45].rstrip() + "..."
                if short_title:
                    session_obj.title = short_title

            session_obj.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session_obj)
        except Exception:
            db.rollback()

    serialized_session = _serialize_session(session_obj, include_messages=True) if session_obj else None

    return {
        "source": source_used,
        "model": model_used,
        "generated_at": _now_iso(),
        "reply": final_reply,
        "suggestions": suggestions,
        "session_id": serialized_session["id"] if serialized_session else None,
        "session_title": serialized_session["title"] if serialized_session else None,
        "messages": serialized_session["messages"] if serialized_session else [],
    }


