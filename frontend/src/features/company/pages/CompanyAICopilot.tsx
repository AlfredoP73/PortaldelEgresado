import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  EyeOff,
  Briefcase,
  Users,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Award,
  HelpCircle,
  DollarSign,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api';
import { getBlindApplications, type BlindCandidate } from '../../../api/aiServices';
import BlindCandidateModal from '../components/BlindCandidateModal';

type CompanyCopilotTab = 'candidates' | 'generator' | 'guide';

interface JobOffer {
  id: number;
  title: string;
  modality?: string;
  salary_min?: number;
  salary_max?: number;
}

interface GeneratedJobTemplate {
  title: string;
  modality: string;
  level: string;
  salaryRange: string;
  summary: string;
  responsibilities: string[];
  skills: string[];
  technicalTest: string;
  interviewQuestions: string[];
}

function buildSmartJobTemplate(roleTitle: string, modality: string, level: string): GeneratedJobTemplate {
  const lower = roleTitle.toLowerCase();
  const isTech =
    lower.includes('sistemas') ||
    lower.includes('desarrollador') ||
    lower.includes('software') ||
    lower.includes('datos') ||
    lower.includes('data') ||
    lower.includes('cloud') ||
    lower.includes('backend') ||
    lower.includes('frontend');
  const isHealth =
    lower.includes('enfermer') ||
    lower.includes('salud') ||
    lower.includes('clínic') ||
    lower.includes('clinic') ||
    lower.includes('microbiolog') ||
    lower.includes('quirúrg');
  const isFinance =
    lower.includes('contad') ||
    lower.includes('financ') ||
    lower.includes('administr') ||
    lower.includes('auditor') ||
    lower.includes('comercio');

  const salaryRange =
    level === 'Senior (3+ años)'
      ? '$5,200,000 - $7,500,000 COP / mes'
      : level === 'Intermedio (1-3 años)'
        ? '$3,600,000 - $5,000,000 COP / mes'
        : '$2,600,000 - $3,500,000 COP / mes';

  if (isTech) {
    return {
      title: roleTitle || 'Ingeniero de Software / Datos',
      modality,
      level,
      salaryRange,
      summary: `Buscamos un(a) ${roleTitle} (${level}) en modalidad ${modality} para diseñar, construir y escalar soluciones digitales de alto impacto. Valoramos egresados con bases sólidas en arquitectura limpia, bases de datos y automatización.`,
      responsibilities: [
        'Diseñar e implementar servicios escalables, APIs RESTful y flujos de datos confiables.',
        'Colaborar con equipos multidisciplinarios bajo metodologías ágiles (Scrum) y revisiones de código.',
        'Optimizar consultas en bases de datos relacionales (PostgreSQL) y despliegues en la nube (AWS / Docker).',
        'Documentar decisiones técnicas y monitorear indicadores de rendimiento y disponibilidad.',
      ],
      skills: ['Python', 'SQL / PostgreSQL', 'React / TypeScript', 'AWS Cloud', 'Docker', 'Git'],
      technicalTest:
        'Caso Práctico (90 min): Construir o auditar un microservicio con un endpoint paginado, proponiendo índices SQL para optimizar tiempos de respuesta por debajo de 150ms y explicando su despliegue en contenedores.',
      interviewQuestions: [
        'Cuéntanos sobre un cuello de botella técnico o de datos que hayas identificado: ¿cómo lo mediste y cómo lo resolviste?',
        '¿Qué criterios utilizas para diseñar el esquema de base de datos y garantizar integridad transaccional?',
        'Describe cómo asegurarías la calidad y observabilidad de esta solución durante tus primeros 60 días en el cargo.',
      ],
    };
  }

  if (isHealth) {
    return {
      title: roleTitle || 'Profesional en Salud / Clínico',
      modality,
      level,
      salaryRange,
      summary: `Convocamos a un(a) ${roleTitle} (${level}) en modalidad ${modality} comprometido(a) con la excelencia asistencial, la seguridad del paciente y el cumplimiento riguroso de protocolos clínicos y de calidad.`,
      responsibilities: [
        'Garantizar la atención integral y humanizada cumpliendo los protocolos de bioseguridad y calidad institucional.',
        'Supervisar y registrar oportunamente los indicadores clínicos y la trazabilidad de procedimientos.',
        'Coordinar con el equipo interdisciplinario la respuesta oportuna ante eventos críticos.',
        'Participar en comités de vigilancia epidemiológica y mejora continua del servicio.',
      ],
      skills: ['Seguridad del Paciente', 'Protocolos Clínicos', 'Bioseguridad', 'Gestión de Calidad en Salud', 'Trabajo Interdisciplinario'],
      technicalTest:
        'Estudio de Caso Clínico (45 min): Resolución de un escenario de priorización de atención (Triage / Eventos Adversos) aplicando protocolos vigentes del Ministerio de Salud y lista de chequeo de seguridad.',
      interviewQuestions: [
        'Describe una situación de alta presión asistencial en la que tuviste que priorizar recursos: ¿qué protocolo aplicaste?',
        '¿Cómo gestionas la comunicación asertiva con pacientes, familiares y el equipo médico durante un turno crítico?',
        '¿Qué indicadores de calidad consideras indispensables para prevenir eventos adversos en tu área?',
      ],
    };
  }

  if (isFinance) {
    return {
      title: roleTitle || 'Analista Financiero y Administrativo',
      modality,
      level,
      salaryRange,
      summary: `Requerimos un(a) ${roleTitle} (${level}) en modalidad ${modality} para liderar el análisis presupuestal, control interno y generación de reportes ejecutivos para la toma de decisiones estratégicas.`,
      responsibilities: [
        'Elaborar y analizar estados financieros, flujos de caja y proyecciones presupuestales mensuales.',
        'Asegurar el cumplimiento normativo contable y tributario (NIIF) y liderar conciliaciones.',
        'Automatizar tableros de indicadores de gestión (KPIs) utilizando Excel Avanzado y Power BI.',
        'Proponer planes de optimización de costos y eficiencia operativa.',
      ],
      skills: ['Normas NIIF', 'Análisis Financiero', 'Excel Avanzado', 'Power BI', 'Control Interno', 'Presupuestos'],
      technicalTest:
        'Caso Práctico (60 min): A partir de un balance de prueba y flujo de caja de 12 meses, identificar 3 desviaciones presupuestales críticas y presentar 2 recomendaciones financieras sustentadas.',
      interviewQuestions: [
        '¿Cómo has utilizado herramientas de análisis de datos (Excel/Power BI) para optimizar un cierre contable o financiero?',
        'Describe un hallazgo de auditoría o control interno que hayas detectado y cómo implementaste la acción correctiva.',
        '¿Qué indicadores financieros monitorearías semanalmente en este rol?',
      ],
    };
  }

  return {
    title: roleTitle || 'Profesional Especialista UPC',
    modality,
    level,
    salaryRange,
    summary: `Buscamos un(a) ${roleTitle} (${level}) en modalidad ${modality} con alta capacidad analítica, orientación al logro y liderazgo colaborativo para integrarse a nuestro equipo estratégico.`,
    responsibilities: [
      'Planificar, ejecutar y controlar los entregables del área garantizando estándares de calidad y cumplimiento.',
      'Analizar indicadores de desempeño y proponer mejoras continuas en los procesos operativos.',
      'Articular esfuerzos con áreas internas y aliados externos para alcanzar las metas trimestrales.',
      'Elaborar informes ejecutivos con hallazgos y recomendaciones accionables.',
    ],
    skills: ['Gestión de Proyectos', 'Análisis de Datos', 'Comunicación Ejecutiva', 'Resolución de Problemas', 'Mejora Continua'],
    technicalTest:
      'Caso Práctico (60 min): Diseñar un plan de acción de 30-60-90 días para optimizar un proceso clave del área, definiendo 3 indicadores de éxito (KPIs) y mitigación de riesgos.',
    interviewQuestions: [
      'Cuéntanos sobre el proyecto más retador en el que participaste: ¿cuál fue tu aporte específico y qué resultado medible obtuviste?',
      '¿Cómo priorizas múltiples entregables cuando los plazos son ajustados?',
      '¿Qué valor diferencial aportarías a nuestro equipo durante tus primeros 90 días?',
    ],
  };
}

export default function CompanyAICopilot() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CompanyCopilotTab>('candidates');

  // Tab 1: Blind Hiring & AI Candidate Evaluator
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<BlindCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [modalAppId, setModalAppId] = useState<number | null>(null);

  // Tab 2: AI Job & Technical Test Generator
  const [roleInput, setRoleInput] = useState<string>('Desarrollador Backend Cloud & Datos');
  const [modalityInput, setModalityInput] = useState<string>('Híbrido');
  const [levelInput, setLevelInput] = useState<string>('Intermedio (1-3 años)');
  const [generatingJob, setGeneratingJob] = useState<boolean>(false);
  const [generatedJob, setGeneratedJob] = useState<GeneratedJobTemplate>(() =>
    buildSmartJobTemplate('Desarrollador Backend Cloud & Datos', 'Híbrido', 'Intermedio (1-3 años)')
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/jobs')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setJobs(list);
        if (list.length > 0) {
          setSelectedJobId(list[0].id);
        }
      })
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    if (selectedJobId !== null) {
      loadBlindCandidates(selectedJobId);
    }
  }, [selectedJobId]);

  const loadBlindCandidates = async (jobId: number) => {
    setLoadingCandidates(true);
    try {
      const res = await getBlindApplications(jobId);
      setCandidates(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleGenerateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleInput.trim()) {
      toast.error('Ingresa el nombre del cargo que deseas estructurar');
      return;
    }
    setGeneratingJob(true);
    setTimeout(() => {
      setGeneratedJob(buildSmartJobTemplate(roleInput.trim(), modalityInput, levelInput));
      setGeneratingJob(false);
      toast.success('Vacante y prueba técnica generadas con IA');
    }, 350);
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentJobTitle =
    jobs.find((j) => j.id === selectedJobId)?.title || 'Vacante Seleccionada';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* =====================================================================
          HERO BANNER DEL COPILOTO IA PARA EMPRESAS
          ===================================================================== */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-6 sm:p-8 shadow-md border border-emerald-800/40">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #34D399 0%, transparent 45%), radial-gradient(circle at 80% 80%, #38BDF8 0%, transparent 45%)',
          }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                Copiloto IA de Reclutamiento Empresarial · Groq LLM
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Protocolo Blind Hiring (Anti-Sesgo)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#FFFFFF' }}>
              Centro de Selección Inteligente y Evaluación a Ciegas
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Evalúa postulantes exclusivamente por sus méritos con el <strong>Resumen Ejecutivo Ciego IA</strong>, genera descripciones de vacantes optimizadas y diseña pruebas técnicas y entrevistas estructuradas en segundos.
            </p>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/25 p-1.5 rounded-2xl border border-white/15 backdrop-blur-sm self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'candidates'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              1. Evaluador Ciego IA ({candidates.length})
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              2. Redactor IA de Vacantes
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              3. Guía Anti-Sesgo & Salarios
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          PESTAÑA 1: EVALUADOR IA DE CANDIDATOS (BLIND HIRING SYNTHESIZER)
          ===================================================================== */}
      {activeTab === 'candidates' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Job Selector Bar */}
          <div
            className="p-5 rounded-3xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-ink-secondary block">
                  Selecciona la Vacante a Evaluar con IA
                </label>
                <select
                  value={selectedJobId ?? ''}
                  onChange={(e) => setSelectedJobId(Number(e.target.value))}
                  className="input mt-1 text-sm font-bold min-w-[260px] sm:min-w-[340px]"
                >
                  {jobs.length === 0 ? (
                    <option value="">Sin vacantes activas</option>
                  ) : (
                    jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} (ID #{j.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => selectedJobId && loadBlindCandidates(selectedJobId)}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold border hover:bg-muted/60 text-ink flex items-center gap-1.5 cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCandidates ? 'animate-spin' : ''}`} />
                Actualizar Postulantes
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('upc_blind_hiring', 'true');
                  navigate('/kanban');
                }}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                Abrir Kanban en Modo Ciego
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Candidate Grid */}
          {loadingCandidates ? (
            <div
              className="p-12 rounded-3xl border text-center space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-ink">
                Anonimizando perfiles y calculando ajuste al cargo...
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div
              className="p-12 rounded-3xl border text-center space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <Users className="w-10 h-10 text-ink-tertiary mx-auto" />
              <h3 className="text-base font-extrabold text-ink">
                Aún no hay postulantes en esta vacante
              </h3>
              <p className="text-xs text-ink-secondary max-w-md mx-auto">
                Selecciona otra oferta laboral en el selector superior o publica una nueva vacante usando el Redactor IA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {candidates.map((cand) => {
                const score = Math.round(cand.match_score ?? 68);
                return (
                  <div
                    key={cand.id}
                    className="rounded-3xl border p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-900 text-emerald-200 flex items-center justify-center font-black shrink-0 border border-emerald-700">
                            <EyeOff className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                              {cand.status}
                            </span>
                            <h4 className="text-base font-black text-ink mt-0.5">
                              {cand.alias || `Candidato UPC #${cand.id}`}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {score}% Match
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-ink-secondary line-clamp-2">
                        {cand.headline || 'Profesional graduado UPC evaluado bajo protocolo de méritos verificables.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                        >
                          <span className="text-[10px] font-bold uppercase text-ink-tertiary block">
                            Experiencia
                          </span>
                          <span className="font-extrabold text-ink">
                            {cand.experience_years || 0} años
                          </span>
                        </div>
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                        >
                          <span className="text-[10px] font-bold uppercase text-ink-tertiary block">
                            Cohorte Grado
                          </span>
                          <span className="font-extrabold text-ink">
                            {cand.graduation_year || 'UPC'}
                          </span>
                        </div>
                      </div>

                      {cand.top_skills && cand.top_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cand.top_skills.slice(0, 4).map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg text-[11px] font-bold border text-ink"
                              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setModalAppId(cand.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Abrir Resumen Ejecutivo Ciego IA
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: GENERADOR IA DE VACANTES Y PRUEBAS TÉCNICAS
          ===================================================================== */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up">
          {/* Left Form */}
          <form
            onSubmit={handleGenerateJob}
            className="lg:col-span-4 p-6 rounded-3xl border shadow-xs space-y-4 self-start"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Asistente de Redacción de Ofertas
              </span>
              <h3 className="text-base font-black text-ink">
                Diseña tu Vacante y Prueba Técnica
              </h3>
              <p className="text-xs text-ink-secondary">
                Estructura una oferta atractiva con competencias ATS, banda salarial y caso práctico de evaluación.
              </p>
            </div>

            <div>
              <label className="text-xs font-extrabold text-ink block mb-1">
                Título del Cargo / Rol Buscado
              </label>
              <input
                type="text"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="Ej. Ingeniero de Datos, Enfermero Jefe, Contador..."
                className="input w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-ink block mb-1">
                Modalidad de Trabajo
              </label>
              <select
                value={modalityInput}
                onChange={(e) => setModalityInput(e.target.value)}
                className="input w-full text-xs font-semibold"
              >
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">100% Remoto</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-ink block mb-1">
                Nivel de Experiencia Requerido
              </label>
              <select
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                className="input w-full text-xs font-semibold"
              >
                <option value="Junior / Primer Empleo (0-1 año)">Junior / Primer Empleo (0-1 año)</option>
                <option value="Intermedio (1-3 años)">Intermedio (1-3 años)</option>
                <option value="Senior (3+ años)">Senior (3+ años)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={generatingJob}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {generatingJob ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar Vacante y Prueba con IA
            </button>

            <button
              type="button"
              onClick={() => navigate('/job-offers')}
              className="w-full py-2.5 px-4 rounded-xl border text-xs font-extrabold text-ink hover:bg-muted/60 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Ir a Publicar en Mis Vacantes
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Right Generated Output */}
          <div
            className="lg:col-span-8 p-6 rounded-3xl border shadow-xs space-y-5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-ink">{generatedJob.title}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    {generatedJob.modality}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Nivel: <strong>{generatedJob.level}</strong> · Banda Salarial Sugerida:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{generatedJob.salaryRange}</strong>
                </p>
              </div>

              <button
                onClick={() =>
                  handleCopy(
                    'full',
                    `${generatedJob.title} (${generatedJob.modality})\n\nResumen:\n${generatedJob.summary}\n\nFunciones:\n- ${generatedJob.responsibilities.join('\n- ')}\n\nHabilidades: ${generatedJob.skills.join(', ')}\n\nPrueba Técnica:\n${generatedJob.technicalTest}`
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/25 transition-colors"
              >
                {copiedKey === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copiar Todo para Vacante
              </button>
            </div>

            <div className="space-y-4">
              <div
                className="p-4 rounded-2xl border space-y-1.5"
                style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Resumen Atractivo del Cargo
                </p>
                <p className="text-xs text-ink leading-relaxed">{generatedJob.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-2xl border space-y-2"
                  style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Responsabilidades Clave
                  </p>
                  <ul className="space-y-1.5 text-xs text-ink">
                    {generatedJob.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-black">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="p-4 rounded-2xl border space-y-2"
                  style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    Competencias para Matchmaking UPC
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {generatedJob.skills.map((sk, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                  <div className="pt-3 mt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Prueba Técnica Sugerida
                    </p>
                    <p className="text-xs text-ink mt-1 leading-relaxed">
                      {generatedJob.technicalTest}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-2xl border space-y-2"
                style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
              >
                <p className="text-[11px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  Preguntas de Entrevista Estructurada (Anti-Sesgo)
                </p>
                <div className="space-y-2">
                  {generatedJob.interviewQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border flex items-start justify-between gap-3"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      <p className="text-xs font-semibold text-ink">
                        <strong className="text-emerald-600 mr-1.5">P{i + 1}.</strong>
                        {q}
                      </p>
                      <button
                        onClick={() => handleCopy(`q-${i}`, q)}
                        className="text-ink-tertiary hover:text-ink shrink-0 cursor-pointer"
                        title="Copiar pregunta"
                      >
                        {copiedKey === `q-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: GUÍA ANTI-SESGO & REFERENCIAS SALARIALES UPC
          ===================================================================== */}
      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in-up">
          <div
            className="p-6 rounded-3xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-ink">
              ¿Cómo funciona el Modo Blind Hiring?
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Durante las etapas de <strong>Postulado</strong> y <strong>En Evaluación</strong>, el portal oculta automáticamente nombres, fotos, edad, género y datos de contacto del egresado, asignándole un alias verificable (ej. <code>Candidato UPC #0752</code>).
            </p>
            <p className="text-xs text-ink-secondary leading-relaxed">
              La identidad completa se desbloquea automáticamente cuando avanzas al candidato a la columna <strong>Entrevistado</strong> o <strong>Contratado</strong>.
            </p>
          </div>

          <div
            className="p-6 rounded-3xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-ink">
              Síntesis Ejecutiva con Groq LLM
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              El Copiloto IA cruza los requisitos técnicos de tu vacante contra las habilidades, proyectos y experiencia del candidato anonimizado, generando:
            </p>
            <ul className="text-xs text-ink space-y-1.5 font-semibold">
              <li>• Puntaje de Ajuste al Cargo (0 a 100)</li>
              <li>• Fortalezas demostradas y evidencias</li>
              <li>• Brechas técnicas a validar</li>
              <li>• 3 preguntas conductuales personalizadas</li>
            </ul>
          </div>

          <div
            className="p-6 rounded-3xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-ink">
              Bandas Salariales Competitivas UPC
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Referencias promedio de contratación mensual en el portal:
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-ink-secondary">Ing. de Sistemas / Software</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">$3.6M - $5.2M</span>
              </div>
              <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-ink-secondary">Enfermería / Salud</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">$3.1M - $4.2M</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-secondary">Administración / Contaduría</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">$2.8M - $4.0M</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dictamen Ejecutivo Ciego */}
      {modalAppId !== null && (
        <BlindCandidateModal
          applicationId={modalAppId}
          onClose={() => setModalAppId(null)}
          onOpenFullModal={(appId: number) => {
            setModalAppId(null);
            navigate('/kanban', { state: { openAppId: appId } });
          }}
        />
      )}
    </div>
  );
}
