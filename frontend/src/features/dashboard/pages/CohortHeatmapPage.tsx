import { useEffect, useMemo, useState } from 'react';
import {
  Flame, DollarSign, Clock, Globe, Sparkles, Filter, RotateCcw,
  Award, Users, TrendingUp, Building2, CheckCircle2, AlertTriangle,
  Info, ArrowUpRight, ArrowDownRight, Layers, Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import {
  getCohortHeatmap,
  getCohortInsights,
  type CohortData,
  type CohortCell,
  type AiInsights,
} from '../../../api/aiServices';

type HeatmapMetric = 'employment_rate' | 'avg_salary' | 'avg_days_to_first_hire' | 'remote_pct';

const METRIC_META: Record<
  HeatmapMetric,
  { label: string; shortLabel: string; unit: string; desc: string }
> = {
  employment_rate: {
    label: 'Tasa de Empleabilidad (%)',
    shortLabel: 'Empleabilidad',
    unit: '%',
    desc: 'Porcentaje de egresados vinculados formalmente por programa académico y año de grado.',
  },
  avg_salary: {
    label: 'Salario Promedio (COP)',
    shortLabel: 'Salario Prom.',
    unit: 'COP',
    desc: 'Remuneración mensual promedio de enganche reportada en contratos y ofertas activas.',
  },
  avg_days_to_first_hire: {
    label: 'Días hasta el 1er Empleo',
    shortLabel: 'Velocidad Inserción',
    unit: 'días',
    desc: 'Velocidad de absorción laboral tras el grado (menor número de días = inserción más rápida).',
  },
  remote_pct: {
    label: '% Modalidad Remota',
    shortLabel: '% Remoto',
    unit: '%',
    desc: 'Proporción de egresados contratados en esquemas 100% remotos o globales.',
  },
};

const PIE_COLORS = ['#059669', '#0284c7', '#6366f1', '#d97706'];

const PROGRAM_SKILLS_MAP: Record<string, string[]> = {
  sistemas: ['Python & FastAPI', 'React / TypeScript', 'AWS Cloud', 'PostgreSQL', 'Docker & CI/CD'],
  ambiental: ['Gestión Ambiental ISO 14001', 'ArcGIS / QGIS', 'Modelación Hidrológica', 'Estudios de Impacto (EIA)'],
  electr: ['Automatización PLC', 'IoT & Sistemas Embebidos', 'Instrumentación Industrial', 'Redes & Telemetría'],
  enfermer: ['Cuidado Crítico UCI', 'Gestión Clínica', 'Seguridad del Paciente', 'Salud Pública'],
  microbiolog: ['Control de Calidad Microbiológico', 'Diagnóstico Molecular', 'BPL / BPM', 'Bioseguridad'],
  instrumentac: ['Asistencia Quirúrgica', 'Esterilización Hospitalaria', 'Dispositivos Médicos', 'Quirófanos'],
  derecho: ['Derecho Administrativo', 'Contratación Estatal', 'Litigio Estratégico', 'Compliance'],
  contadur: ['NIIF / IFRS', 'Planeación Tributaria', 'Auditoría Financiera', 'Power BI Financiero'],
  administrac: ['Gerencia de Proyectos', 'Planeación Estratégica', 'Analítica Comercial', 'Liderazgo Ágil'],
};

function getProgramSkills(programName: string): string[] {
  const lower = (programName || '').toLowerCase();
  for (const [k, skills] of Object.entries(PROGRAM_SKILLS_MAP)) {
    if (lower.includes(k)) return skills;
  }
  return ['Gestión de Proyectos', 'Análisis de Datos', 'Herramientas Digitales', 'Trabajo Multidisciplinario'];
}

export default function CohortHeatmapPage() {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<HeatmapMetric>('employment_rate');
  const [selectedCell, setSelectedCell] = useState<CohortCell | null>(null);

  const [programFilter, setProgramFilter] = useState<string>('');
  const [yearMin, setYearMin] = useState<string>('2021');
  const [yearMax, setYearMax] = useState<string>('2025');

  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (programFilter) filters.program_id = Number(programFilter);
      if (yearMin) filters.year_min = Number(yearMin);
      if (yearMax) filters.year_max = Number(yearMax);
      const res = await getCohortHeatmap(filters);
      setData(res.data);
      if (res.data.cells?.length > 0) {
        setSelectedCell((prev) => {
          if (prev) {
            const match = res.data.cells.find(
              (c) => c.program_id === prev.program_id && c.year === prev.year
            );
            if (match) return match;
          }
          return res.data.cells[0];
        });
      }
    } catch (err) {
      toast.error('No se pudo cargar el mapa de calor de cohortes');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setLoadingInsights(true);
      const filters: any = {};
      if (programFilter) filters.program_id = Number(programFilter);
      if (yearMin) filters.year_min = Number(yearMin);
      if (yearMax) filters.year_max = Number(yearMax);
      const res = await getCohortInsights(filters);
      setInsights(res.data);
      toast.success('Lectura estratégica generada con IA');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al generar hallazgos con IA');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [programFilter, yearMin, yearMax]);

  // Calcula el rango dinámico (min/max) de la métrica seleccionada para una escala térmica real
  const metricBounds = useMemo(() => {
    if (!data?.cells?.length) return { min: 0, max: 100, avg: 50 };
    const vals = data.cells
      .map((c) => Number(c[metric]))
      .filter((v) => !Number.isNaN(v) && v > 0);
    if (!vals.length) return { min: 0, max: 100, avg: 50 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max: max === min ? min + 1 : max, avg };
  }, [data, metric]);

  // Normaliza entre 0 (bajo desempeño) y 1 (élite) según la métrica activa
  const getNormalizedScore = (cell: CohortCell | undefined, m: HeatmapMetric): number => {
    if (!cell || cell[m] === null || cell[m] === undefined) return 0;
    const v = Number(cell[m]);
    const { min, max } = metricBounds;
    const span = Math.max(1e-5, max - min);
    if (m === 'avg_days_to_first_hire') {
      // Menos días = mejor (cercano a 1)
      return Math.max(0, Math.min(1, (max - v) / span));
    }
    return Math.max(0, Math.min(1, (v - min) / span));
  };

  // Escala térmica de 5 niveles claramente diferenciados
  const getThermalTier = (norm: number) => {
    if (norm >= 0.80) {
      return {
        label: 'Élite',
        bg: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
        border: '#047857',
        text: '#ffffff',
        subText: 'rgba(209,250,229,0.92)',
        barBg: 'rgba(255,255,255,0.28)',
        barFill: '#a7f3d0',
      };
    }
    if (norm >= 0.60) {
      return {
        label: 'Sobresaliente',
        bg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
        border: '#0d9488',
        text: '#ffffff',
        subText: 'rgba(204,251,241,0.92)',
        barBg: 'rgba(255,255,255,0.25)',
        barFill: '#99f6e4',
      };
    }
    if (norm >= 0.40) {
      return {
        label: 'Competitivo',
        bg: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
        border: '#0284c7',
        text: '#ffffff',
        subText: 'rgba(224,242,254,0.92)',
        barBg: 'rgba(255,255,255,0.25)',
        barFill: '#bae6fd',
      };
    }
    if (norm >= 0.22) {
      return {
        label: 'Moderado',
        bg: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        border: '#d97706',
        text: '#ffffff',
        subText: 'rgba(254,243,199,0.95)',
        barBg: 'rgba(255,255,255,0.25)',
        barFill: '#fde68a',
      };
    }
    return {
      label: 'En Impulso',
      bg: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
      border: '#e11d48',
      text: '#ffffff',
      subText: 'rgba(255,228,230,0.92)',
      barBg: 'rgba(255,255,255,0.25)',
      barFill: '#fecdd3',
    };
  };

  const formatCellValue = (cell: CohortCell | undefined, m: HeatmapMetric) => {
    if (!cell) return '—';
    const val = cell[m];
    if (val === null || val === undefined) return 'Sin datos';
    if (m === 'avg_salary') return `$${(val / 1000000).toFixed(2)}M`;
    if (m === 'avg_days_to_first_hire') return `${Math.round(val)} días`;
    return `${val.toFixed(1)}%`;
  };

  // Serie temporal agregada por año de graduación (2021..2025)
  const yearlyTrendData = useMemo(() => {
    if (!data?.years?.length || !data?.cells?.length) return [];
    return data.years.map((yr) => {
      const yrCells = data.cells.filter((c) => c.year === yr);
      const avgEmp =
        yrCells.reduce((acc, c) => acc + (c.employment_rate || 0), 0) /
        Math.max(1, yrCells.length);
      const avgSal =
        yrCells.reduce((acc, c) => acc + (c.avg_salary || 0), 0) /
        Math.max(1, yrCells.length);
      const avgRemote =
        yrCells.reduce((acc, c) => acc + (c.remote_pct || 0), 0) /
        Math.max(1, yrCells.length);
      return {
        year: String(yr),
        empleabilidad: Number(avgEmp.toFixed(1)),
        salarioM: Number((avgSal / 1000000).toFixed(2)),
        remoto: Number(avgRemote.toFixed(1)),
      };
    });
  }, [data]);

  // Ranking promedio por programa académico
  const programComparisonData = useMemo(() => {
    if (!data?.programs?.length || !data?.cells?.length) return [];
    return data.programs
      .map((p) => {
        const pCells = data.cells.filter((c) => c.program_id === p.id);
        const avgEmp =
          pCells.reduce((acc, c) => acc + (c.employment_rate || 0), 0) /
          Math.max(1, pCells.length);
        const avgRemote =
          pCells.reduce((acc, c) => acc + (c.remote_pct || 0), 0) /
          Math.max(1, pCells.length);
        const avgSal =
          pCells.reduce((acc, c) => acc + (c.avg_salary || 0), 0) /
          Math.max(1, pCells.length);
        return {
          program: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name,
          fullName: p.name,
          empleabilidad: Number(avgEmp.toFixed(1)),
          remoto: Number(avgRemote.toFixed(1)),
          salarioM: Number((avgSal / 1000000).toFixed(2)),
        };
      })
      .sort((a, b) => b.empleabilidad - a.empleabilidad);
  }, [data]);

  const summary = data?.summary;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ====================================================================
          HERO HEADER EJECUTIVO
          ==================================================================== */}
      <div
        className="p-6 sm:p-7 rounded-3xl border shadow-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #065f46 52%, #0f766e 100%)',
          borderColor: 'rgba(16,185,129,0.45)',
        }}
      >
        <div
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: '#ecfdf5',
                }}
              >
                OBSERVATORIO DE IMPACTO GRADUADO · UPC
              </span>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-extrabold border"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.24)',
                  borderColor: 'rgba(110,231,183,0.4)',
                  color: '#d1fae5',
                }}
              >
                Matriz Multidimensional 2021 – 2025
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="p-2 rounded-2xl bg-white/15 border border-white/20 shrink-0">
                <Flame className="w-7 h-7 text-amber-300" />
              </span>
              <span>Mapa de Calor de Empleabilidad y Salarios por Cohorte</span>
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'rgba(236,253,245,0.9)' }}>
              Analítica térmica de inserción laboral, bandas salariales de enganche, velocidad al primer contrato y penetración de trabajo remoto por programa y promoción.
            </p>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={loadingInsights}
            className="px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 text-xs font-black flex items-center gap-2 shadow-md transition-all self-start lg:self-auto shrink-0"
          >
            <Sparkles className={`w-4 h-4 text-emerald-600 ${loadingInsights ? 'animate-spin' : ''}`} />
            <span>
              {loadingInsights
                ? 'Sintetizando cohortes con Groq IA...'
                : 'Generar Lectura Estratégica con IA (Groq)'}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          PANEL DE INSIGHTS IA (CUANDO SE ACTIVA)
          ==================================================================== */}
      {insights && (
        <div
          className="p-6 rounded-3xl border shadow-xs space-y-4 animate-fade-in-up relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #059669, #10b981, #0ea5e9)' }}
          />
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Síntesis Estratégica de Trayectoria por Inteligencia Artificial
              </h3>
            </div>
            <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {insights.source === 'groq' ? `IA · Groq (${insights.model})` : 'Motor Analítico Institucional'}
            </span>
          </div>
          <p className="text-sm font-extrabold text-ink">{insights.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.insights.map((ins, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border space-y-1.5"
                style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-1.5">
                  {ins.tone === 'positive' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : ins.tone === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-extrabold text-ink">{ins.title}</h4>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed">{ins.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          4 TARJETAS KPI EJECUTIVAS
          ==================================================================== */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary">
                Egresados Analizados
              </span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <p className="text-3xl font-black text-ink mt-2">{summary.total_graduates.toLocaleString('es-CO')}</p>
            <p className="text-xs text-ink-secondary mt-1">
              Tasa global de inserción:{' '}
              <strong className="text-emerald-700 font-black">{summary.overall_employment_rate}%</strong>
            </p>
          </div>

          <div
            className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary">
                Cohorte Líder en Empleo
              </span>
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">
              {summary.best_cohort ? `${summary.best_cohort.employment_rate}%` : 'N/A'}
            </p>
            <p className="text-xs font-extrabold text-ink truncate mt-1">
              {summary.best_cohort ? `${summary.best_cohort.program} (${summary.best_cohort.year})` : ''}
            </p>
          </div>

          <div
            className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary">
                Mayor Salario Promedio
              </span>
              <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-sky-600 mt-2">
              {summary.highest_salary_cohort
                ? `$${(summary.highest_salary_cohort.avg_salary / 1000000).toFixed(2)}M COP`
                : 'N/A'}
            </p>
            <p className="text-xs font-extrabold text-ink truncate mt-1">
              {summary.highest_salary_cohort
                ? `${summary.highest_salary_cohort.program} (${summary.highest_salary_cohort.year})`
                : ''}
            </p>
          </div>

          <div
            className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary">
                Inserción Más Rápida
              </span>
              <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-violet-600 mt-2">
              {summary.fastest_cohort ? `${summary.fastest_cohort.avg_days_to_first_hire} días` : 'N/A'}
            </p>
            <p className="text-xs font-extrabold text-ink truncate mt-1">
              {summary.fastest_cohort
                ? `${summary.fastest_cohort.program} (${summary.fastest_cohort.year})`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          MATRIZ DE CALOR + INSPECTOR PROFUNDO DE COHORTE
          ==================================================================== */}
      <div
        className="p-5 sm:p-6 rounded-3xl border shadow-xs space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {/* Barra Superior de Métricas y Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(METRIC_META) as HeatmapMetric[]).map((mKey) => (
              <button
                key={mKey}
                onClick={() => setMetric(mKey)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border ${
                  metric === mKey
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-transparent text-ink-secondary border-[var(--border-color)] hover:border-emerald-400'
                }`}
              >
                {METRIC_META[mKey].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-transparent font-semibold"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value="">Todos los programas</option>
              {data?.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-transparent font-semibold"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {[2021, 2022, 2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  Desde {y}
                </option>
              ))}
            </select>
            <select
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-transparent font-semibold"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {[2021, 2022, 2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>
                  Hasta {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setProgramFilter('');
                setYearMin('2021');
                setYearMax('2025');
              }}
              className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1 ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Leyenda Térmica de 5 Niveles */}
        <div
          className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-xs text-ink-secondary font-medium">{METRIC_META[metric].desc}</p>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-ink-tertiary mr-1">
              Escala Térmica:
            </span>
            {[
              { label: 'En Impulso', color: '#e11d48' },
              { label: 'Moderado', color: '#d97706' },
              { label: 'Competitivo', color: '#0284c7' },
              { label: 'Sobresaliente', color: '#0d9488' },
              { label: 'Élite (Top)', color: '#059669' },
            ].map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-2xs"
                style={{ backgroundColor: t.color }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Matriz + Inspector */}
        {loading ? (
          <div className="py-16 text-center text-sm text-ink-secondary animate-pulse">
            Calculando matriz térmica multidimensional de cohortes...
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Tabla Matriz Térmica (8 columnas) */}
            <div className="xl:col-span-8 overflow-x-auto">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-black uppercase tracking-wider text-ink-secondary px-3 py-2.5 rounded-xl">
                      Programa Académico \ Cohorte
                    </th>
                    {data.years.map((yr) => (
                      <th
                        key={yr}
                        className="text-center text-xs font-black uppercase tracking-wider text-ink px-3 py-2.5 rounded-xl"
                      >
                        Cohorte {yr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((prog) => {
                    const progCells = data.cells.filter((c) => c.program_id === prog.id);
                    const avgEmp =
                      progCells.reduce((a, c) => a + (c.employment_rate || 0), 0) /
                      Math.max(1, progCells.length);

                    return (
                      <tr key={prog.id}>
                        <td
                          className="px-3.5 py-3 rounded-2xl border min-w-[200px]"
                          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                        >
                          <p className="text-xs font-black text-ink leading-snug">{prog.name}</p>
                          <span className="text-[10px] font-bold text-ink-tertiary">
                            Media inserción: {avgEmp.toFixed(1)}%
                          </span>
                        </td>
                        {data.years.map((yr, yrIdx) => {
                          const cell = data.cells.find((c) => c.program_id === prog.id && c.year === yr);
                          const prevCell =
                            yrIdx > 0
                              ? data.cells.find(
                                  (c) => c.program_id === prog.id && c.year === data.years[yrIdx - 1]
                                )
                              : undefined;

                          const isSelected =
                            selectedCell?.program_id === prog.id && selectedCell?.year === yr;
                          const norm = getNormalizedScore(cell, metric);
                          const tier = getThermalTier(norm);

                          // Delta vs año anterior para mostrar tendencia en la celda
                          let deltaStr: string | null = null;
                          let deltaPositive = true;
                          if (cell && prevCell && cell[metric] != null && prevCell[metric] != null) {
                            const diff = Number(cell[metric]) - Number(prevCell[metric]);
                            if (metric === 'avg_salary') {
                              const diffM = diff / 1000000;
                              deltaStr = `${diffM >= 0 ? '+' : ''}${diffM.toFixed(2)}M`;
                              deltaPositive = diffM >= 0;
                            } else if (metric === 'avg_days_to_first_hire') {
                              deltaStr = `${diff >= 0 ? '+' : ''}${Math.round(diff)}d`;
                              deltaPositive = diff <= 0; // menos días es positivo
                            } else {
                              deltaStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
                              deltaPositive = diff >= 0;
                            }
                          }

                          return (
                            <td key={yr} className="p-0 min-w-[112px]">
                              <button
                                type="button"
                                onClick={() => cell && setSelectedCell(cell)}
                                style={{
                                  background: cell ? tier.bg : 'var(--bg-muted)',
                                  borderColor: isSelected ? '#fbbf24' : cell ? tier.border : 'var(--border-color)',
                                  color: cell ? tier.text : 'var(--text-muted)',
                                }}
                                className={`w-full p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.03] shadow-xs ${
                                  isSelected ? 'ring-3 ring-amber-400 shadow-md scale-[1.02]' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-black tracking-tight">
                                    {formatCellValue(cell, metric)}
                                  </span>
                                  {deltaStr && (
                                    <span
                                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center"
                                      style={{
                                        backgroundColor: 'rgba(0,0,0,0.22)',
                                        color: deltaPositive ? '#a7f3d0' : '#fecdd3',
                                      }}
                                    >
                                      {deltaPositive ? (
                                        <ArrowUpRight className="w-2.5 h-2.5" />
                                      ) : (
                                        <ArrowDownRight className="w-2.5 h-2.5" />
                                      )}
                                      {deltaStr}
                                    </span>
                                  )}
                                </div>

                                {/* Mini barra de intensidad térmica dentro de la celda */}
                                {cell && (
                                  <>
                                    <div
                                      className="h-1.5 rounded-full overflow-hidden my-1.5"
                                      style={{ backgroundColor: tier.barBg }}
                                    >
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${Math.max(15, Math.round(norm * 100))}%`,
                                          backgroundColor: tier.barFill,
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="flex items-center justify-between text-[10px] font-bold"
                                      style={{ color: tier.subText }}
                                    >
                                      <span>
                                        {cell.hired}/{cell.graduates} vinc.
                                      </span>
                                      <span>{tier.label}</span>
                                    </div>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inspector Profundo de Cohorte Seleccionada (4 columnas, completo y sin espacios vacíos) */}
            <div
              className="xl:col-span-4 p-5 rounded-3xl border space-y-5"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              {selectedCell ? (
                <>
                  {/* Cabecera de la Cohorte */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-700 text-white">
                        Cohorte {selectedCell.year}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Sector líder: {selectedCell.top_sector || 'Tecnología & Servicios'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-ink leading-snug">{selectedCell.program}</h3>
                    <p className="text-xs text-ink-secondary">
                      Radiografía detallada de inserción, salarios, modalidad y competencias clave de esta promoción.
                    </p>
                  </div>

                  {/* 4 Tarjetas de Indicadores de la Cohorte */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="p-3.5 rounded-2xl border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">Empleabilidad</span>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">{selectedCell.employment_rate}%</p>
                      <span className="text-[10px] font-semibold text-ink-secondary">
                        {selectedCell.hired} de {selectedCell.graduates} graduados
                      </span>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">Salario Promedio</span>
                      <p className="text-xl font-black text-ink mt-0.5">
                        {selectedCell.avg_salary ? `$${(selectedCell.avg_salary / 1000000).toFixed(2)}M` : 'N/A'}
                      </p>
                      <span className="text-[10px] font-semibold text-ink-secondary">Mensual COP</span>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">Tiempo al 1er Empleo</span>
                      <p className="text-xl font-black text-violet-600 mt-0.5">
                        {selectedCell.avg_days_to_first_hire ? `${selectedCell.avg_days_to_first_hire} días` : 'N/A'}
                      </p>
                      <span className="text-[10px] font-semibold text-ink-secondary">Promedio cohorte</span>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      <span className="text-[10px] font-black uppercase text-ink-tertiary">Trabajo Remoto</span>
                      <p className="text-xl font-black text-sky-600 mt-0.5">{selectedCell.remote_pct ?? 0}%</p>
                      <span className="text-[10px] font-semibold text-ink-secondary">
                        Híbrido: {selectedCell.hybrid_pct ?? 0}%
                      </span>
                    </div>
                  </div>

                  {/* Mix de Modalidad de esta Cohorte (Barra Apilada) */}
                  <div
                    className="p-4 rounded-2xl border space-y-2.5"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-ink-secondary">
                        Mix de Modalidad en esta Cohorte
                      </span>
                      <span className="text-[10px] font-bold text-ink-tertiary">100% contratos</span>
                    </div>
                    {(() => {
                      const rem = Math.round(selectedCell.remote_pct ?? 20);
                      const hyb = Math.round(selectedCell.hybrid_pct ?? 30);
                      const pres = Math.max(0, 100 - rem - hyb);
                      return (
                        <>
                          <div className="h-3 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${rem}%`, backgroundColor: '#0284c7' }}
                              title={`Remoto: ${rem}%`}
                            />
                            <div
                              style={{ width: `${hyb}%`, backgroundColor: '#10b981' }}
                              title={`Híbrido: ${hyb}%`}
                            />
                            <div
                              style={{ width: `${pres}%`, backgroundColor: '#6366f1' }}
                              title={`Presencial: ${pres}%`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-ink-secondary">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-sky-600" /> Remoto {rem}%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Híbrido {hyb}%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Presencial {pres}%
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Comparativa de la Cohorte vs Media Institucional UPC */}
                  <div
                    className="p-4 rounded-2xl border space-y-2.5"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink-secondary block">
                      Benchmarking vs. Media Institucional UPC
                    </span>
                    {(() => {
                      const globalEmp = summary?.overall_employment_rate || 78;
                      const diffEmp = ((selectedCell.employment_rate ?? 0) - globalEmp).toFixed(1);
                      const positive = Number(diffEmp) >= 0;
                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink-secondary font-medium">Diferencial de Empleabilidad:</span>
                          <span
                            className={`font-black px-2 py-0.5 rounded-md ${
                              positive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {positive ? `+${diffEmp}%` : `${diffEmp}%`} vs. media UPC ({globalEmp}%)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Competencias Más Demandadas para este Programa */}
                  <div
                    className="p-4 rounded-2xl border space-y-2.5"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Competencias Más Contratadas en {selectedCell.program}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {getProgramSkills(selectedCell.program).map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-ink-secondary">
                  Selecciona una celda del mapa de calor para inspeccionar su radiografía.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ====================================================================
          FILA DE GRÁFICOS ANALÍTICOS AVANZADOS
          ==================================================================== */}
      {data && (
        <>
          {/* Fila 1: Tendencia Inter-Cohorte (2021-2025) + Ranking Comparativo por Carrera */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-3xl border shadow-xs space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-black text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolución Histórica por Cohorte de Grado (2021 – 2025)
                </h3>
                <p className="text-xs text-ink-secondary">
                  Tendencia anual de Tasa de Empleabilidad (%) y Trabajo Remoto (%) en las promociones graduadas.
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearlyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="remGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="empleabilidad"
                      name="Tasa Empleabilidad (%)"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#empGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="remoto"
                      name="Modalidad Remota (%)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fill="url(#remGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="p-6 rounded-3xl border shadow-xs space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-black text-ink flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  Comparativa de Inserción y Trabajo Remoto por Programa
                </h3>
                <p className="text-xs text-ink-secondary">
                  Desempeño consolidado de empleabilidad y contratación remota según carrera universitaria.
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="program" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="empleabilidad" name="Empleabilidad (%)" fill="#059669" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="remoto" name="% Trabajo Remoto" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2: Salarios por Sector Económico + Mix de Modalidad */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 p-6 rounded-3xl border shadow-xs space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-black text-ink flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Remuneración Promedio por Sector Económico Receptor (COP)
                </h3>
                <p className="text-xs text-ink-secondary">
                  Comparativa salarial en los sectores productivos que contratan egresados de la UPC.
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sector_salary} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="sector" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString('es-CO')} COP`, 'Salario Promedio']}
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="avg_salary" fill="#059669" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="p-6 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-black text-ink flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-600" />
                  Mix Global de Modalidad Laboral
                </h3>
                <p className="text-xs text-ink-secondary">
                  Distribución consolidada entre trabajo presencial, híbrido y remoto.
                </p>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.modality_mix}
                      dataKey="count"
                      nameKey="modality"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {data.modality_mix.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div
                className="flex flex-wrap justify-around gap-2 text-xs pt-3 border-t"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {data.modality_mix.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="font-extrabold text-ink">{m.modality}:</span>
                    <span className="text-ink-secondary font-semibold">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
