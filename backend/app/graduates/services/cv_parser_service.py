"""
Servicio de Parseo de Curriculum Vitae (CV) 100% basado en Reglas y Heurísticas (Sin LLMs).
Extrae texto de archivos PDF (vía pypdf o pdfplumber), identifica secciones canónicas,
aplica expresiones regulares para fechas y datos de contacto, y cruza competencias
con el catálogo institucional de la Universidad Popular del Cesar.
"""

import io
import re
import unicodedata
from datetime import date, datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

MONTH_MAP = {
    "ene": 1, "enero": 1, "jan": 1, "january": 1,
    "feb": 2, "febrero": 2, "february": 2,
    "mar": 3, "marzo": 3, "march": 3,
    "abr": 4, "abril": 4, "apr": 4, "april": 4,
    "may": 5, "mayo": 5,
    "jun": 6, "junio": 6, "june": 6,
    "jul": 7, "julio": 7, "july": 7,
    "ago": 8, "agosto": 8, "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "septiembre": 9, "september": 9,
    "oct": 10, "octubre": 10, "october": 10,
    "nov": 11, "noviembre": 11, "november": 11,
    "dic": 12, "diciembre": 12, "dec": 12, "december": 12,
}

SECTION_HEADERS = {
    "summary": [
        r"perfil(\s+profesional)?", r"resumen(\s+ejecutivo)?", r"sobre\s+m[ií]",
        r"acerca\s+de\s+m[ií]", r"profile", r"summary", r"about\s+me"
    ],
    "experience": [
        r"experiencia(\s+laboral|\s+profesional)?", r"historial\s+laboral",
        r"trayectoria\s+profesional", r"work\s+experience", r"employment\s+history",
        r"experiencia"
    ],
    "education": [
        r"educaci[oó]n(\s+y\s+formaci[oó]n)?", r"formaci[oó]n(\s+acad[eé]mica)?",
        r"estudios(\s+realizados)?", r"academic\s+background", r"education"
    ],
    "skills": [
        r"habilidades(\s+t[eé]cnicas)?", r"competencias(\s+clave)?",
        r"conocimientos(\s+t[eé]cnicos)?", r"tecnolog[ií]as", r"skills",
        r"herramientas"
    ],
    "languages": [
        r"idiomas", r"lenguajes", r"languages"
    ],
    "certifications": [
        r"certificaciones(\s+y\s+cursos)?", r"cursos(\s+y\s+certificados)?",
        r"certifications", r"licencias"
    ]
}

def normalize_text(text: str) -> str:
    """Normaliza texto eliminando acentos para búsquedas insensibles a tildes."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()

def extract_raw_text(file_bytes: bytes) -> str:
    """Extrae texto de un PDF utilizando pypdf o pdfplumber como fallback."""
    text = ""
    # Intento 1: pypdf (rápido y nativo en memoria)
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
        text = "\n".join(pages_text)
    except Exception as e:
        print(f"pypdf extraction notice: {e}")

    # Intento 2: pdfplumber si el texto salió vacío o con error
    if not text.strip():
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = [p.extract_text() or "" for p in pdf.pages]
                text = "\n".join(pages_text)
        except Exception as e:
            print(f"pdfplumber extraction notice: {e}")

    return text or ""

def extract_contact_info(text: str) -> Dict[str, Any]:
    """Extrae correo electrónico, teléfonos y nombres probables."""
    contact = {
        "email": None,
        "phone": None,
        "first_name": None,
        "last_name": None
    }
    
    # 1. Email Regex
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', text)
    if email_match:
        contact["email"] = email_match.group(0).lower()

    # 2. Teléfono Regex (soporta prefijo Colombia +57, móviles 3xx y fijos con separadores)
    phone_pattern = r'(?:\+?57\s*)?(?:3\d{2}[-.\s]?\d{3}[-.\s]?\d{4}|\(?\d{1,3}\)?[-.\s]?\d{3}[-.\s]?\d{4})'
    phone_match = re.search(phone_pattern, text)
    if phone_match:
        contact["phone"] = phone_match.group(0).strip()

    # 3. Estimación de Nombre: analizar primeras 5 líneas no vacías
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:5]:
        # Descartar líneas con emails, teléfonos, enlaces o muy largas/cortas
        if "@" in line or "http" in line or re.search(r'\d', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w.isalpha()):
            contact["first_name"] = words[0]
            contact["last_name"] = " ".join(words[1:])
            break

    return contact

def split_into_sections(text: str) -> Dict[str, str]:
    """Segmenta el documento en bloques temáticos usando encabezados regex."""
    lines = text.splitlines()
    sections: Dict[str, List[str]] = {k: [] for k in SECTION_HEADERS}
    current_section = "summary" # Sección por defecto para el encabezado

    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue
        
        # Verificar si la línea es un encabezado de sección
        norm_line = normalize_text(cleaned_line)
        found_section = None
        for sec_name, patterns in SECTION_HEADERS.items():
            for pat in patterns:
                if re.match(rf'^[\s*#\-_]*{pat}[\s*#\-:_]*$', norm_line):
                    found_section = sec_name
                    break
            if found_section:
                break
                
        if found_section:
            current_section = found_section
        else:
            if current_section in sections:
                sections[current_section].append(cleaned_line)

    return {k: "\n".join(v) for k, v in sections.items()}

def parse_date_span(text_chunk: str) -> tuple[Optional[str], Optional[str]]:
    """Extrae start_date y end_date a partir de cadenas de fechas comunes en CVs."""
    # Expresión para rangos de años o meses/años: ej. '2020 - 2023', 'ene 2021 - Presente', '03/2019 - 08/2022'
    date_regex = re.compile(
        r'(\b[A-Za-z]{3,10}\b|\d{1,2})?[\s\/\.-]*(\d{4})\s*[-–—aA]\s*(\b[A-Za-z]{3,10}\b|\d{1,2})?[\s\/\.-]*(\d{4}|presente|actualidad|actual|hoy)?',
        re.IGNORECASE
    )
    match = date_regex.search(text_chunk)
    if not match:
        # Búsqueda de un único año aislado
        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', text_chunk)
        if year_match:
            y = int(year_match.group(1))
            return f"{y}-01-01", None
        return None, None

    m1_str, y1_str, m2_str, y2_str = match.groups()
    try:
        y1 = int(y1_str)
        m1 = 1
        if m1_str:
            norm_m1 = normalize_text(m1_str)[:3]
            m1 = MONTH_MAP.get(norm_m1, 1) if not m1_str.isdigit() else max(1, min(12, int(m1_str)))
        start_date = f"{y1:04d}-{m1:02d}-01"
    except Exception:
        start_date = None

    end_date = None
    if y2_str:
        norm_y2 = normalize_text(y2_str)
        if any(term in norm_y2 for term in ["presente", "actualidad", "actual", "hoy"]):
            end_date = None
        else:
            try:
                y2 = int(y2_str)
                m2 = 12
                if m2_str:
                    norm_m2 = normalize_text(m2_str)[:3]
                    m2 = MONTH_MAP.get(norm_m2, 12) if not m2_str.isdigit() else max(1, min(12, int(m2_str)))
                end_date = f"{y2:04d}-{m2:02d}-01"
            except Exception:
                end_date = None

    return start_date, end_date

def parse_experiences(exp_text: str) -> List[Dict[str, Any]]:
    """Extrae bloques de experiencia laboral de forma heurística."""
    if not exp_text.strip():
        return []

    lines = [l.strip() for l in exp_text.splitlines() if l.strip()]
    experiences = []
    current_exp: Optional[Dict[str, Any]] = None

    for i, line in enumerate(lines):
        start_d, end_d = parse_date_span(line)
        if start_d:
            # Línea con fecha detectada -> nuevo hito de experiencia
            # Determinar cargo y empresa de la línea actual o anterior
            pos = "Profesional"
            comp = "Empresa"
            
            # Buscar separadores en la línea anterior o en la actual
            context_line = lines[i - 1] if i > 0 and len(lines[i - 1]) < 80 else line
            clean_ctx = re.sub(r'(\b\d{4}\b|presente|actualidad).*$', '', context_line, flags=re.IGNORECASE).strip()
            
            if " en " in clean_ctx.lower():
                parts = re.split(r'\s+en\s+', clean_ctx, flags=re.IGNORECASE)
                pos, comp = parts[0].strip(), parts[1].strip()
            elif "|" in clean_ctx:
                parts = clean_ctx.split("|")
                pos, comp = parts[0].strip(), parts[1].strip()
            elif "-" in clean_ctx:
                parts = clean_ctx.split("-")
                pos, comp = parts[0].strip(), parts[1].strip()
            elif clean_ctx:
                pos = clean_ctx

            if current_exp:
                experiences.append(current_exp)

            current_exp = {
                "position": pos[:90],
                "company_name": comp[:140],
                "start_date": start_d,
                "end_date": end_d,
                "description": ""
            }
        else:
            if current_exp:
                if len(current_exp["description"]) < 500:
                    current_exp["description"] = (current_exp["description"] + " " + line).strip()

    if current_exp:
        experiences.append(current_exp)

    return experiences

def parse_education(edu_text: str) -> List[Dict[str, Any]]:
    """Extrae títulos e instituciones educativas."""
    if not edu_text.strip():
        return []

    lines = [l.strip() for l in edu_text.splitlines() if l.strip()]
    education_list = []
    
    institutions_keywords = ["universidad", "instituto", "sena", "colegio", "fundacion", "escuela", "institucion"]
    degree_keywords = ["ingenier", "licenciatura", "tecnic", "tecnolog", "especializ", "maestr", "bachiller", "diplomado", "pregrado"]

    current_edu: Optional[Dict[str, Any]] = None

    for line in lines:
        start_d, end_d = parse_date_span(line)
        norm = normalize_text(line)

        is_inst = any(k in norm for k in institutions_keywords)
        is_deg = any(k in norm for k in degree_keywords)

        if start_d or is_inst or is_deg:
            if current_edu and (current_edu["degree"] or current_edu["institution"]):
                if not current_edu["institution"]:
                    current_edu["institution"] = "Universidad Popular del Cesar"
                if not current_edu["degree"]:
                    current_edu["degree"] = "Grado Académico"
                education_list.append(current_edu)

            current_edu = {
                "institution": line if is_inst else "",
                "degree": line if is_deg else "",
                "start_date": start_d or f"{date.today().year - 5}-01-01",
                "end_date": end_d or f"{date.today().year}-12-31"
            }
        else:
            if current_edu:
                if not current_edu["institution"] and is_inst:
                    current_edu["institution"] = line
                elif not current_edu["degree"] and is_deg:
                    current_edu["degree"] = line

    if current_edu:
        if not current_edu["institution"]:
            current_edu["institution"] = "Universidad Popular del Cesar"
        if not current_edu["degree"]:
            current_edu["degree"] = "Grado Académico"
        education_list.append(current_edu)

    return education_list

def match_skills(full_text: str, db: Session) -> List[Dict[str, Any]]:
    """
    Cruza el contenido completo del CV contra el catálogo de skills en la base de datos
    utilizando límites de palabra (\\b) y normalización de caracteres.
    """
    from app.graduates.models import Skill
    db_skills = db.query(Skill).all()
    normalized_doc = f" {normalize_text(full_text)} "

    matched = []
    for sk in db_skills:
        clean_name = normalize_text(sk.name)
        if len(clean_name) < 2:
            continue
            
        pattern = rf'\b{re.escape(clean_name)}\b'
        if re.search(pattern, normalized_doc):
            matched.append({
                "skill_id": sk.id,
                "skill_name": sk.name,
                "proficiency_level": "Intermedio"
            })

    return matched

def parse_cv_document(file_bytes: bytes, db: Session) -> Dict[str, Any]:
    """
    Función principal de parseo determinístico de CV.
    Genera el diccionario prellenado para la pantalla de confirmación.
    """
    raw_text = extract_raw_text(file_bytes)
    if not raw_text.strip():
        return {
            "first_name": "",
            "last_name": "",
            "phone": "",
            "email": "",
            "profile_summary": "",
            "experiences": [],
            "academic_histories": [],
            "skills": []
        }

    contact = extract_contact_info(raw_text)
    sections = split_into_sections(raw_text)

    summary_text = sections.get("summary", "").strip()
    if not summary_text:
        # Extraer primeras 300 letras como resumen introductorio
        summary_text = " ".join([l.strip() for l in raw_text.splitlines()[:10] if l.strip()])[:350]

    experiences = parse_experiences(sections.get("experience", ""))
    education = parse_education(sections.get("education", ""))
    skills = match_skills(raw_text, db)

    return {
        "first_name": contact.get("first_name") or "",
        "last_name": contact.get("last_name") or "",
        "phone": contact.get("phone") or "",
        "email": contact.get("email") or "",
        "profile_summary": summary_text[:500],
        "experiences": experiences,
        "academic_histories": education,
        "skills": skills
    }

