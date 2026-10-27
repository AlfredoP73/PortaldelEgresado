# Contrato de API — Funcionalidades Innovadoras con IA (Portal del Egresado UPC)

Documento de referencia compartido por backend, web (React) y app móvil (Flutter).
**Roles (`role_id`)**: 1 = ADMIN, 2 = COMPANY, 3 = GRADUATE. Todas las rutas requieren `Authorization: Bearer <JWT>`.

**Enrutamiento (ALB / Nginx)** — no cambia:
| Prefijo | Microservicio |
|---|---|
| `/api/modulo1/*` | graduates |
| `/api/modulo2/*` | companies |
| `/matching/*` (también `/api/matching/*`) | matchmaking |
| `/api/dashboard/*`, `/api/graduate/*`, `/api/company/*` | dashboard |

**Convenciones de respuesta de IA** (todas las respuestas generadas por IA incluyen):
`"source": "groq" | "heuristic"` (heurístico = respaldo local cuando no hay clave de Groq o el servicio falla),
`"model": string | null`, `"generated_at": ISO-8601`.
La UI debe mostrar una insignia discreta "IA · Groq" cuando `source == "groq"` y "Análisis local" cuando `heuristic`.
Errores: `429` (límite de consultas de IA del usuario → mostrar `detail`), `404`, `403` estándar FastAPI `{ "detail": "..." }`.
Las llamadas de IA pueden tardar 2-15 s: usar timeout ≥ 40 s en cliente y estados de carga.

---
## A. Copiloto IA del Egresado — microservicio `graduates` (rol GRADUATE)

### `GET /api/modulo1/ai/status`
`{ "enabled": true, "model": "llama-3.3-70b-versatile" }`

### `POST /api/modulo1/ai/coach/analyze`
Body opcional: `{ "target_role": "Desarrollador Backend" }`
```json
{
  "source": "groq", "model": "llama-3.3-70b-versatile", "generated_at": "2026-10-27T15:00:00Z",
  "overall_score": 72,
  "level": "Inicial | En desarrollo | Competitivo | Destacado",
  "headline": "Diagnóstico en una frase",
  "suggested_headline": "Ingeniero de Sistemas | Backend & Cloud",
  "sections": [
    {
      "key": "summary | experience | education | skills | projects | certifications | visibility",
      "label": "Resumen profesional",
      "score": 60,
      "status": "critical | improve | good | excellent",
      "findings": ["..."],
      "actions": ["..."]
    }
  ],
  "quick_wins": [ { "title": "", "detail": "", "impact": "high | medium | low", "section": "summary" } ],
  "improved_summary": "Texto en primera persona basado solo en hechos del perfil",
  "skills_to_add": [ { "name": "Docker", "reason": "..." } ],
  "keywords": ["Python", "APIs REST"],
  "plan_30_days": [ { "week": 1, "goal": "", "tasks": ["..."] } ]
}
```

### `POST /api/modulo1/ai/coach/rewrite`
Body: `{ "field": "summary | experience | project | headline | cover_letter", "text": "...", "context": { "position": "", "company": "", "job_title": "" } }`
```json
{ "source": "groq", "model": "...", "generated_at": "...", "original": "...", "improved": "...",
  "changes": ["Añadí verbos de acción ..."], "warnings": ["Completa [añadir métrica] con un dato real"] }
```

### `POST /api/modulo1/ai/coach/chat`
Body: `{ "messages": [ { "role": "user | assistant", "content": "..." } ] }` (máx. 12; el último es `user`)
`{ "source": "...", "model": "...", "generated_at": "...", "reply": "...", "suggestions": ["¿Cómo mejoro mi resumen?", "..."] }`

---
## B. Reclutamiento a Ciegas + Dictamen IA — microservicio `companies` (rol COMPANY; ADMIN lectura)

Regla de revelado (server-side): la identidad se revela solo si `status ∈ {ENTREVISTADO, CONTRATADO}`.
En modo ciego NUNCA se envían nombre, apellido, correo, teléfono, foto, URL del CV ni nombres de instituciones/empresas.
La IA solo recibe el perfil anonimizado.

### `GET /api/modulo2/applications/job/{job_offer_id}/blind`
```json
[
  {
    "id": 15, "job_offer_id": 3, "alias": "Candidato UPC #A482",
    "status": "POSTULADO", "application_date": "2026-10-20T14:00:00Z",
    "match_score": 87.5, "identity_revealed": false,
    "headline": "Programa 1 · Egresado 2024 · 2.5 años de experiencia",
    "program_id": 1, "graduation_year": 2024, "experience_years": 2.5,
    "top_skills": ["Python", "SQL"],
    "cover_letter_available": true, "rejection_reason": null,
    "sub_processes": [ /* igual que el endpoint normal */ ],
    "graduate": null
  }
]
```
Si `identity_revealed == true`, `graduate` = `{ user_id, first_name, last_name, program_id, graduation_year }` y `alias` se mantiene.

### `GET /api/modulo2/applications/{application_id}/blind-profile`
```json
{
  "application_id": 15, "alias": "Candidato UPC #A482", "identity_revealed": false,
  "program_id": 1, "graduation_year": 2024, "experience_years": 2.5,
  "availability_status": "open_to_work", "preferred_modality": "Remoto", "expected_salary": 3500000,
  "profile_summary": "texto saneado",
  "skills": [ { "name": "Python", "level": "Avanzado" } ],
  "experiences": [ { "position": "Desarrollador Junior", "duration_months": 18, "is_current": false, "description": "texto saneado" } ],
  "education": [ { "degree": "Ingeniería de Sistemas", "year_completed": 2024 } ],
  "certifications": [ { "name": "AWS Cloud Practitioner", "year": 2025 } ],
  "projects": [ { "title": "", "description": "", "technologies": "" } ],
  "cover_letter": "texto saneado o null",
  "match_score": 87.5
}
```

### `POST /api/modulo2/applications/{application_id}/ai-summary`
Body opcional: `{ "force": false }` (true ignora la caché de 15 min)
```json
{
  "source": "groq", "model": "...", "generated_at": "...", "application_id": 15, "alias": "Candidato UPC #A482",
  "fit_label": "Alto | Medio | Bajo", "fit_score": 82,
  "executive_summary": "2-3 oraciones neutrales",
  "strengths": ["..."], "gaps": ["..."], "evidence": ["Hechos verificables del perfil"],
  "interview_questions": ["...", "...", "..."],
  "bias_guard": "Dictamen generado sin nombre, foto, contacto ni instituciones."
}
```

---
## C. Radiografía de Competencia en Vivo — microservicio `matchmaking` (rol GRADUATE; ADMIN)

### `GET /matching/benchmark/{job_offer_id}?include_ai=true`
404 `{"detail": "Aún no te has postulado a esta vacante"}` si el egresado no está postulado.
```json
{
  "job_offer_id": 3, "job_title": "Desarrollador Backend", "applied": true, "application_status": "POSTULADO",
  "total_applicants": 18, "my_rank": 3, "percentile": 84,
  "competitiveness": "Top 10% | Top 25% | Mitad superior | Mitad inferior | Por debajo del promedio",
  "my_score": 85.0,
  "avg_score": 68.2, "median_score": 70.0, "top_score": 92.0,
  "stats_hidden": false,
  "breakdown": [ { "key": "skills | experience | program", "label": "Habilidades", "mine": 85, "avg": 60, "top": 100 } ],
  "stage_distribution": [ { "status": "POSTULADO", "count": 10 } ],
  "my_gaps": [ { "skill": "Docker", "required_level": "Intermedio" } ],
  "strengths": ["Tu programa coincide con la vacante"],
  "improvement_levers": [ { "title": "Agrega Docker a tu perfil", "detail": "Podría subir tu afinidad", "estimated_gain": 8.0 } ],
  "ai_tips": { "source": "groq", "model": "...", "summary": "...", "tips": ["...", "...", "..."] },
  "updated_at": "..."
}
```
Privacidad: nunca se exponen datos de otros postulados. Con menos de 3 postulados: `stats_hidden = true` y `avg_score`, `median_score`, `top_score` y `avg`/`top` del desglose son `null`.
`ai_tips` es `null` si `include_ai=false`.

---
## D. Mapa de Calor de Empleabilidad por Cohorte — microservicio `dashboard` (roles ADMIN y GRADUATE)

### `GET /api/dashboard/cohorts?program_id=&year_min=&year_max=`
```json
{
  "generated_at": "...", "audience": "admin | graduate",
  "programs": [ { "id": 1, "name": "Ingeniería de Sistemas" } ],
  "years": [2021, 2022, 2023, 2024],
  "cells": [
    { "program_id": 1, "program": "Ingeniería de Sistemas", "year": 2023,
      "graduates": 34, "hired": 21, "employment_rate": 61.8,
      "avg_days_to_first_hire": 42.5, "avg_salary": 3450000,
      "remote_pct": 38.1, "hybrid_pct": 30.0, "onsite_pct": 31.9,
      "top_sector": "Tecnología", "low_sample": false }
  ],
  "summary": {
    "total_graduates": 120, "overall_employment_rate": 54.2,
    "best_cohort": { "program": "...", "year": 2023, "employment_rate": 80.0 },
    "highest_salary_cohort": { "program": "...", "year": 2022, "avg_salary": 4100000 },
    "fastest_cohort": { "program": "...", "year": 2024, "avg_days_to_first_hire": 21.0 }
  },
  "modality_mix": [ { "modality": "Remoto", "count": 12 } ],
  "sector_salary": [ { "sector": "Tecnología", "avg_salary": 3900000, "hires": 14 } ],
  "metrics_notes": { "time_to_hire": "Días entre la primera postulación y la contratación registrada en el portal" }
}
```
`low_sample = true` cuando la celda tiene < 3 egresados; en ese caso, para audiencia `graduate`, `avg_salary` y `avg_days_to_first_hire` son `null`. Valores sin datos = `null` (nunca inventar; la UI muestra "Sin datos").

### `POST /api/dashboard/cohorts/insights`
Body: `{ "program_id": null, "year_min": null, "year_max": null }`
```json
{ "source": "groq", "model": "...", "generated_at": "...", "audience": "admin | graduate",
  "headline": "...",
  "insights": [ { "title": "", "detail": "", "tone": "positive | warning | neutral" } ],
  "recommendations": ["..."] }
```

---
## E. Tablero Ejecutivo (BI) — microservicio `dashboard` (rol ADMIN)

`GET /api/dashboard/admin/analytics` (existente). Las claves actuales se **mantienen** (`kpis`, `placement_benchmark`,
`occupational_distribution`, `skill_gap_matrix`, `timeline`, `top_companies`, `raw_records`); se permite **añadir** campos.
Requisitos: sin datos inventados (si no hay datos → arreglos vacíos/`null` y la UI muestra estados vacíos), deltas reales.

### `POST /api/dashboard/admin/analytics/insights`
Body: `{ "program_id": null, "year_min": null, "year_max": null, "modality": null }` → mismo formato que `/cohorts/insights` (audience `admin`).

---
## Notas de implementación
* `applications.status_updated_at` (nuevo, nullable): fecha del último cambio de estado. Tiempo de contratación = `status_updated_at - application_date` cuando `status == CONTRATADO`.
* Variables de entorno de IA (solo backend): `GROQ_API_KEY`, `GROQ_MODEL` (def. `llama-3.3-70b-versatile`), `GROQ_FAST_MODEL` (def. `llama-3.1-8b-instant`). **Nunca** exponer la clave al cliente.

