import { useEffect, useState } from 'react';
import {
  Flame, DollarSign, Clock, Globe, Sparkles, Filter, RotateCcw,
  Award, Users, TrendingUp, Building2, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
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

const METRIC_META: Record<HeatmapMetric, { label: string; unit: string; desc: string }> = {
  employment_rate: {
    label: 'Tasa de Empleabilidad (%)',
    unit: '%',
    desc: 'Porcentaje de egresados contratados por programa y año de grado.',
  },
  avg_salary: {
    label: 'Salario Promedio (COP)',
    unit: 'COP',
    desc: 'Remuneración mensual promedio de primer empleo registrado.',
  },
  avg_days_to_first_hire: {
    label: 'Días hasta el 1er Empleo',
    unit: 'días',
    desc: 'Menor número de días significa inserción laboral más rápida.',
  },
  remote_pct: {
    label: '% Modalidad Remota',
    unit: '%',
    desc: 'Proporción de contrataciones en trabajo 100% remoto.',
  },
};

const PIE_COLORS = ['#087443', '#0EA5E9', '#6366F1'];

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
      if (res.data.cells?.length > 0 && !selectedCell) {
        setSelectedCell(res.data.cells[0]);
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
      toast.success('Análisis de trayectoria generado con IA');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al generar hallazgos con IA');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [programFilter, yearMin, yearMax]);

  const formatCellValue = (cell: CohortCell | undefined, m: HeatmapMetric) => {
    if (!cell) return '—';
    const val = cell[m];
    if (val === null || val === undefined) return 'Sin datos';
    if (m === 'avg_salary') return `$${(val / 1000000).toFixed(2)}M`;
    if (m === 'avg_days_to_first_hire') return `${Math.round(val)}d`;
    return `${val.toFixed(1)}%`;
  };

  const getCellStyle = (cell: CohortCell | undefined, m: HeatmapMetric) => {
    if (!cell || cell[m] === null || cell[m] === undefined) {
      return { backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' };
    }
    const v = Number(cell[m]);
    let intensity = 0.5;
    if (m === 'employment_rate') {
      intensity = Math.max(0.15, Math.min(1, (v - 55) / 40));
    } else if (m === 'avg_salary') {
      intensity = Math.max(0.15, Math.min(1, (v - 2800000) / 1800000));
    } else if (m === 'avg_days_to_first_hire') {
      // Menos días = más verde
      intensity = Math.max(0.15, Math.min(1, (65 - v) / 45));
    } else {
      intensity = Math.max(0.15, Math.min(1, v / 60));
    }

    const alpha = (0.14 + intensity * 0.72).toFixed(2);
    const textDark = intensity > 0.58;
    return {
      backgroundColor: `rgba(8, 116, 67, ${alpha})`,
      color: textDark ? '#ffffff' : 'var(--text-main)',
      borderColor: intensity > 0.5 ? 'rgba(8,116,67,0.5)' : 'var(--border-color)',
    };
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div
        className="p-6 rounded-3xl border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              ALUMNI CAREER TRAJECTORY · UPC
            </span>
            <span className="text-xs text-ink-tertiary">Observatorio de Impacto Graduado</span>
          </div>
          <h1 className="text-2xl font-black text-ink mt-1 flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-emerald-600" />
            Mapa de Calor de Empleabilidad y Salarios por Cohorte
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Explora la inserción real, salarios promedio, velocidad de contratación y trabajo remoto por programa y promoción de grado.
          </p>
        </div>

        <button
          onClick={handleGenerateInsights}
          disabled={loadingInsights}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-800 hover:to-teal-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all self-start lg:self-auto"
        >
          <Sparkles className={`w-4 h-4 ${loadingInsights ? 'animate-spin' : ''}`} />
          <span>{loadingInsights ? 'Analizando cohortes con Groq IA...' : 'Generar Lectura Estratégica con IA'}</span>
        </button>
      </div>

      {/* Panel de Insights IA */}
      {insights && (
        <div
          className="p-6 rounded-3xl border space-y-4 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.05))',
            borderColor: 'rgba(16,185,129,0.3)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Síntesis de Trayectoria por Inteligencia Artificial
              </h3>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-emerald-800 border border-emerald-300">
              {insights.source === 'groq' ? `IA · Groq (${insights.model})` : 'Análisis Heurístico Institucional'}
            </span>
          </div>
          <p className="text-sm font-bold text-ink">{insights.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.insights.map((ins, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/85 dark:bg-neutral-900/75 border space-y-1.5"
                style={{ borderColor: 'var(--border-color)' }}
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

      {/* KPIs Resumen */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary uppercase">
              <span>Egresados Analizados</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-ink mt-2">{summary.total_graduates}</p>
            <p className="text-[11px] text-ink-tertiary mt-1">Tasa global de inserción: <strong>{summary.overall_employment_rate}%</strong></p>
          </div>

          <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary uppercase">
              <span>Cohorte Líder en Empleo</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-600 mt-2">
              {summary.best_cohort ? `${summary.best_cohort.employment_rate}%` : 'N/A'}
            </p>
            <p className="text-xs font-bold text-ink truncate mt-0.5">
              {summary.best_cohort ? `${summary.best_cohort.program} (${summary.best_cohort.year})` : ''}
            </p>
          </div>

          <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary uppercase">
              <span>Mayor Salario Promedio</span>
              <DollarSign className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-xl font-black text-sky-600 mt-2">
              {summary.highest_salary_cohort ? `$${(summary.highest_salary_cohort.avg_salary / 1000000).toFixed(2)}M COP` : 'N/A'}
            </p>
            <p className="text-xs font-bold text-ink truncate mt-0.5">
              {summary.highest_salary_cohort ? `${summary.highest_salary_cohort.program} (${summary.highest_salary_cohort.year})` : ''}
            </p>
          </div>

          <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs font-bold text-ink-secondary uppercase">
              <span>Inserción Más Rápida</span>
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xl font-black text-violet-600 mt-2">
              {summary.fastest_cohort ? `${summary.fastest_cohort.avg_days_to_first_hire} días` : 'N/A'}
            </p>
            <p className="text-xs font-bold text-ink truncate mt-0.5">
              {summary.fastest_cohort ? `${summary.fastest_cohort.program} (${summary.fastest_cohort.year})` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Controles y Selector de Métrica del Mapa de Calor */}
      <div
        className="p-5 rounded-3xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(METRIC_META) as HeatmapMetric[]).map((mKey) => (
              <button
                key={mKey}
                onClick={() => setMetric(mKey)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
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
            <Filter className="w-4 h-4 text-brand-600" />
            <select
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-transparent"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {[2021, 2022, 2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>Desde {y}</option>
              ))}
            </select>
            <select
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              className="px-3 py-1.5 rounded-xl border text-xs bg-transparent"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {[2021, 2022, 2023, 2024, 2025].map((y) => (
                <option key={y} value={y}>Hasta {y}</option>
              ))}
            </select>
            <button
              onClick={() => { setProgramFilter(''); setYearMin('2021'); setYearMax('2025'); }}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-secondary">{METRIC_META[metric].desc} Haz clic en cualquier celda para inspeccionar el detalle de esa cohorte.</p>

        {/* Matriz de Mapa de Calor */}
        {loading ? (
          <div className="py-16 text-center text-sm text-ink-secondary animate-pulse">
            Calculando matriz multidimensional de cohortes...
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 overflow-x-auto">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-black uppercase tracking-wider text-ink-secondary px-3 py-2">
                      Programa Académico \ Cohorte
                    </th>
                    {data.years.map((yr) => (
                      <th key={yr} className="text-center text-xs font-black uppercase tracking-wider text-ink px-3 py-2">
                        {yr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((prog) => (
                    <tr key={prog.id}>
                      <td className="text-xs font-bold text-ink px-3 py-2.5 rounded-xl bg-muted/50 border" style={{ borderColor: 'var(--border-color)' }}>
                        {prog.name}
                      </td>
                      {data.years.map((yr) => {
                        const cell = data.cells.find((c) => c.program_id === prog.id && c.year === yr);
                        const isSelected = selectedCell?.program_id === prog.id && selectedCell?.year === yr;
                        const style = getCellStyle(cell, metric);
                        return (
                          <td key={yr} className="p-0">
                            <button
                              type="button"
                              onClick={() => cell && setSelectedCell(cell)}
                              style={style}
                              className={`w-full py-3.5 px-2 rounded-xl border text-center transition-all hover:scale-[1.03] ${
                                isSelected ? 'ring-2 ring-emerald-500 shadow-md' : ''
                              }`}
                            >
                              <span className="block text-sm font-black">{formatCellValue(cell, metric)}</span>
                              {cell && (
                                <span className="block text-[10px] opacity-80 font-semibold mt-0.5">
                                  {cell.hired}/{cell.graduates} vinc.
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inspector de Cohorte Seleccionada */}
            <div
              className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              {selectedCell ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                        Cohorte {selectedCell.year}
                      </span>
                      <span className="text-xs font-bold text-ink-secondary">
                        Sector líder: {selectedCell.top_sector || 'General'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-ink">{selectedCell.program}</h3>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-surface border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <span className="text-[10px] font-bold uppercase text-ink-tertiary">Empleabilidad</span>
                        <p className="text-lg font-black text-emerald-600">{selectedCell.employment_rate}%</p>
                        <span className="text-[10px] text-ink-secondary">{selectedCell.hired} de {selectedCell.graduates} graduados</span>
                      </div>
                      <div className="p-3 rounded-xl bg-surface border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <span className="text-[10px] font-bold uppercase text-ink-tertiary">Salario Promedio</span>
                        <p className="text-lg font-black text-ink">
                          {selectedCell.avg_salary ? `$${(selectedCell.avg_salary / 1000000).toFixed(2)}M` : 'N/A'}
                        </p>
                        <span className="text-[10px] text-ink-secondary">Mensual COP</span>
                      </div>
                      <div className="p-3 rounded-xl bg-surface border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <span className="text-[10px] font-bold uppercase text-ink-tertiary">Tiempo al 1er Empleo</span>
                        <p className="text-lg font-black text-ink">
                          {selectedCell.avg_days_to_first_hire ? `${selectedCell.avg_days_to_first_hire} días` : 'N/A'}
                        </p>
                        <span className="text-[10px] text-ink-secondary">Promedio cohorte</span>
                      </div>
                      <div className="p-3 rounded-xl bg-surface border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <span className="text-[10px] font-bold uppercase text-ink-tertiary">Trabajo Remoto</span>
                        <p className="text-lg font-black text-sky-600">{selectedCell.remote_pct ?? 0}%</p>
                        <span className="text-[10px] text-ink-secondary">Híbrido: {selectedCell.hybrid_pct ?? 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t text-[11px] text-ink-tertiary" style={{ borderColor: 'var(--border-color)' }}>
                    {data.metrics_notes?.time_to_hire}
                  </div>
                </>
              ) : (
                <p className="text-xs text-ink-secondary">Selecciona una celda del mapa de calor para ver su radiografía.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Gráficos Inferiores: Salarios por Sector y Distribución de Modalidad */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 p-5 rounded-3xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Remuneración Promedio por Sector Económico Receptor (COP)
              </h3>
              <p className="text-xs text-ink-secondary">Comparativa salarial en sectores que contratan egresados UPC.</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sector_salary} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="sector" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CO')} COP`, 'Salario Promedio']}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="avg_salary" fill="#087443" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="p-5 rounded-3xl border shadow-xs space-y-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-600" />
                Mix de Modalidad de Contratación
              </h3>
              <p className="text-xs text-ink-secondary">Distribución entre trabajo presencial, híbrido y remoto.</p>
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
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {data.modality_mix.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-xs pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {data.modality_mix.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-bold text-ink">{m.modality}:</span>
                  <span className="text-ink-secondary">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

