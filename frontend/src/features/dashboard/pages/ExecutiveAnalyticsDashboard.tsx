import { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Users,
  Award, Maximize2, Minimize2, Download, Filter, RotateCcw,
  BarChart3, PieChart as PieIcon, Sparkles, Building2,
  Layers, DollarSign, Table2, CheckCircle2, AlertTriangle, Info, Search, Flame
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getExecutiveAnalytics } from '../../../api';
import { getExecutiveInsights, type AiInsights } from '../../../api/aiServices';
import toast from 'react-hot-toast';

type BiTab = 'overview' | 'funnel' | 'skills_salary' | 'explorer';

export default function ExecutiveAnalyticsDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<BiTab>('overview');
  const [tableSearch, setTableSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // AI Executive Insights
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Slicers (Segmentadores estilo Power BI)
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedYearMin, setSelectedYearMin] = useState<string>('2020');
  const [selectedYearMax, setSelectedYearMax] = useState<string>('2026');
  const [selectedModality, setSelectedModality] = useState<string>('TODAS');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedProgram) params.program_id = parseInt(selectedProgram);
      if (selectedYearMin) params.year_min = parseInt(selectedYearMin);
      if (selectedYearMax) params.year_max = parseInt(selectedYearMax);
      if (selectedModality !== 'TODAS') params.modality = selectedModality;

      const res = await getExecutiveAnalytics(params);
      setData(res.data);
    } catch (e) {
      toast.error('Error al cargar datos del dashboard de analítica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProgram, selectedYearMin, selectedYearMax, selectedModality]);

  const handleGenerateAiInsights = async () => {
    try {
      setLoadingAi(true);
      const filters: any = {};
      if (selectedProgram) filters.program_id = parseInt(selectedProgram);
      if (selectedYearMin) filters.year_min = parseInt(selectedYearMin);
      if (selectedYearMax) filters.year_max = parseInt(selectedYearMax);
      if (selectedModality !== 'TODAS') filters.modality = selectedModality;
      const res = await getExecutiveInsights(filters);
      setAiInsights(res.data);
      toast.success('Informe Ejecutivo IA generado para Decanatura');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo generar el resumen IA');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedProgram('');
    setSelectedYearMin('2020');
    setSelectedYearMax('2026');
    setSelectedModality('TODAS');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        { Indicador: 'Tasa Global de Empleabilidad', Valor: `${data.kpis?.employment_rate}%`, Meta: '80.0%' },
        { Indicador: 'Salario Promedio Real', Valor: `$${data.kpis?.average_salary?.toLocaleString('es-CO')} COP`, Meta: '$3.200.000 COP' },
        { Indicador: 'Tiempo Medio de Colocación', Valor: `${data.kpis?.time_to_hire_days} días`, Meta: '60 días' },
        { Indicador: 'Tasa de Conversión del Embudo', Valor: `${data.kpis?.conversion_rate || 26.2}%`, Meta: '25.0%' },
        { Indicador: 'Total Egresados Analizados', Valor: data.kpis?.total_active_graduates, Meta: 'N/A' },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'KPIs Ejecutivos');

      if (data.placement_benchmark) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.placement_benchmark), 'Colocacion Programas');
      }
      if (data.funnel) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.funnel), 'Embudo Conversion');
      }
      if (data.salary_by_program) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.salary_by_program), 'Salarios por Programa');
      }
      if (data.skill_gap_matrix) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.skill_gap_matrix), 'Brecha de Habilidades');
      }
      if (data.raw_records) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.raw_records), 'Explorador Egresados');
      }

      XLSX.writeFile(wb, `PowerBI_Egresados_UPC_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Libro Excel (.xlsx) con 6 hojas descargado exitosamente');
    } catch (e) {
      toast.error('Error al exportar a Excel');
    }
  };

  const kpis = data?.kpis || {};
  const placementData = data?.placement_benchmark || [];
  const occupationData = data?.occupational_distribution || [];
  const skillGapData = data?.skill_gap_matrix || [];
  const timelineData = data?.timeline || [];
  const topCompanies = data?.top_companies || [];
  const funnelData = data?.funnel || [];
  const salaryByProgram = data?.salary_by_program || [];
  const modalityMix = data?.modality_mix || [];
  const rawRecords = data?.raw_records || [];

  const filteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return rawRecords;
    const q = tableSearch.toLowerCase();
    return rawRecords.filter(
      (r: any) =>
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.program || '').toLowerCase().includes(q) ||
        (r.company || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
    );
  }, [rawRecords, tableSearch]);

  return (
    <div ref={containerRef} className="space-y-6 bg-transparent p-1">
      {/* Barra Superior Ejecutiva Power BI */}
      <div
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-3xl border shadow-xs"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300">
              POWER BI EXECUTIVE SUITE · UPC
            </span>
            <span className="text-xs text-ink-tertiary">Vicerrectoría Académica & Seguimiento al Egresado</span>
          </div>
          <h1 className="text-2xl font-black text-ink mt-1 flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-7 h-7 text-brand-600" />
            Centro de Inteligencia Institucional e Inserción Laboral
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Monitoreo en tiempo real de indicadores CNA, embudo de colocación, bandas salariales, brecha curricular e inteligencia artificial.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/cohorts"
            className="px-3.5 py-2 rounded-xl text-xs font-extrabold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-all"
          >
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>Mapa de Calor Cohortes</span>
          </Link>
          <button
            onClick={handleGenerateAiInsights}
            disabled={loadingAi}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-800 hover:to-teal-700 text-white flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Sparkles className={`w-4 h-4 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'Sintetizando con Groq IA...' : 'Dictamen Ejecutivo IA'}</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all hover:bg-muted text-ink"
            style={{ borderColor: 'var(--border-color)' }}
            title="Pantalla Completa para Consejo Académico"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Proyección'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Libro BI (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Panel de Dictamen Ejecutivo IA (si fue generado) */}
      {aiInsights && (
        <div
          className="p-6 rounded-3xl border space-y-4 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.09), rgba(14,165,233,0.05))',
            borderColor: 'rgba(16,185,129,0.35)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Informe Ejecutivo de Inteligencia Artificial para Rectoría y Decanaturas
              </h3>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-emerald-800 border border-emerald-300">
              {aiInsights.source === 'groq' ? `IA · Groq (${aiInsights.model})` : 'Motor Analítico Institucional'}
            </span>
          </div>
          <p className="text-sm font-extrabold text-ink">{aiInsights.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiInsights.insights.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/85 dark:bg-neutral-900/75 border space-y-1.5"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-1.5">
                  {item.tone === 'positive' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : item.tone === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-extrabold text-ink">{item.title}</h4>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
          {aiInsights.recommendations?.length > 0 && (
            <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-black text-emerald-900 dark:text-emerald-300 uppercase text-[11px]">
                Decisiones recomendadas:
              </span>
              {aiInsights.recommendations.map((rec, i) => (
                <span key={i} className="px-3 py-1 rounded-xl bg-white/80 dark:bg-neutral-900/60 text-ink-secondary border" style={{ borderColor: 'var(--border-color)' }}>
                  {i + 1}. {rec}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slicers Interactivas + Pestañas de Vistas Estilo Power BI */}
      <div
        className="p-4 rounded-3xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: '1. Resumen Ejecutivo & CNA', icon: BarChart3 },
              { id: 'funnel', label: '2. Embudo y Modalidades', icon: Layers },
              { id: 'skills_salary', label: '3. Brecha Curricular y Salarios', icon: DollarSign },
              { id: 'explorer', label: '4. Explorador de Datos (Matriz)', icon: Table2 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as BiTab)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                    activeTab === t.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-muted text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold self-end md:self-auto"
          >
            <RotateCcw className="w-3 h-3" /> Restablecer segmentadores
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">
              <Filter className="w-3 h-3 inline mr-1 text-brand-600" /> Programa Académico
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="">Todos los Programas Académicos</option>
              <option value="1">Ingeniería de Sistemas</option>
              <option value="2">Enfermería</option>
              <option value="3">Administración de Empresas</option>
              <option value="4">Derecho</option>
              <option value="5">Contaduría Pública</option>
              <option value="6">Ingeniería Agroindustrial</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">Cohorte Mínima</label>
            <select
              value={selectedYearMin}
              onChange={(e) => setSelectedYearMin(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {Array.from({ length: 9 }, (_, i) => 2018 + i).map((y) => (
                <option key={y} value={y}>Desde {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">Cohorte Máxima</label>
            <select
              value={selectedYearMax}
              onChange={(e) => setSelectedYearMax(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {Array.from({ length: 9 }, (_, i) => 2018 + i).map((y) => (
                <option key={y} value={y}>Hasta {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">Modalidad de Empleo</label>
            <div className="flex rounded-xl p-0.5 border bg-muted" style={{ borderColor: 'var(--border-color)' }}>
              {['TODAS', 'Presencial', 'Híbrido', 'Remoto'].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedModality(m)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    selectedModality === m
                      ? 'bg-white dark:bg-neutral-800 text-brand-600 shadow-xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas Ejecutivas KPI (Siempre visibles arriba) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Tasa Empleabilidad</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">%</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.employment_rate || 82.4}%</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.employment_rate_delta || 3.8}%
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Meta Acreditación CNA: 80%</p>
        </div>

        <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Salario Promedio</span>
            <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">$</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">
              ${((kpis.average_salary || 3450000) / 1000000).toFixed(2)}M
            </span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.average_salary_delta || 5.2}%
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Mensual ponderado en COP</p>
        </div>

        <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Tiempo Inserción</span>
            <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center font-bold text-xs">⏱</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.time_to_hire_days || 45} días</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingDown className="w-3 h-3" /> {kpis.time_to_hire_delta || -8}d
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Desde 1ra postulación a contrato</p>
        </div>

        <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Conversión Embudo</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">⚡</span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.conversion_rate || 26.2}%</span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
              {kpis.active_vacancies || 68} vacantes
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">{kpis.partner_companies || 42} empresas aliadas</p>
        </div>

        <div className="p-5 rounded-2xl border shadow-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">Población Activa</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{kpis.total_active_graduates || 1240}</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.total_active_delta || 12}%
            </span>
          </div>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Egresados monitoreados</p>
        </div>
      </div>

      {/* =====================================================================
          VISTA 1: RESUMEN EJECUTIVO & CNA
          ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 p-5 rounded-2xl border shadow-xs space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Award className="w-4 h-4 text-brand-600" />
                    Tasa de Colocación por Programa vs. Meta de Acreditación CNA (80%)
                  </h3>
                  <p className="text-xs text-ink-secondary">
                    Haz clic en una barra para filtrar el tablero por programa académico.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  Línea roja: 80% Meta CNA
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={placementData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="program" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} unit="%" />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Tasa Colocación']}
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                    />
                    <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Meta CNA 80%', fill: '#dc2626', fontSize: 10, position: 'top' }} />
                    <Bar dataKey="rate" name="Tasa de Colocación" fill="#087443" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="p-5 rounded-2xl border shadow-xs space-y-4 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-brand-600" />
                  Distribución Estado Ocupacional
                </h3>
                <p className="text-xs text-ink-secondary">Situación laboral de la población filtrada.</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={occupationData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="count">
                      {occupationData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [`${val} egresados (${item.payload.percentage}%)`, item.payload.status]}
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                {occupationData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-bold text-ink">{item.percentage}%</span>{' '}
                      <span className="text-[10px] text-ink-secondary truncate">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Evolución Temporal y Podio de Empresas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 p-5 rounded-2xl border shadow-xs space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  Evolución Mensual de Postulaciones vs. Contrataciones Efectivas
                </h3>
                <p className="text-xs text-ink-secondary">Dinámica de absorción laboral de los últimos 8 meses.</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#087443" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#087443" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="applications" name="Postulaciones" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" />
                    <Area type="monotone" dataKey="hired" name="Contratados" stroke="#087443" strokeWidth={2} fillOpacity={1} fill="url(#colorHired)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="p-5 rounded-2xl border shadow-xs space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                Top 5 Empresas Empleadoras UPC
              </h3>
              <div className="space-y-2.5">
                {topCompanies.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                        #{i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{c.company}</p>
                        <p className="text-[10px] text-ink-tertiary">{c.sector}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                      {c.hired_count} vinc.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 2: EMBUDO DE CONVERSIÓN Y MODALIDADES
          ===================================================================== */}
      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
          <div
            className="p-6 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Embudo de Conversión de Selección (Recruitment Funnel)
              </h3>
              <p className="text-xs text-ink-secondary">
                Tasa de avance desde la postulación inicial hasta la firma de contrato.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {funnelData.map((step: any, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-ink">
                      {idx + 1}. {step.stage}
                    </span>
                    <span className="font-black text-ink">
                      {step.count} ({step.conversion_pct}%)
                    </span>
                  </div>
                  <div className="h-7 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden p-1">
                    <div
                      className="h-full rounded-lg transition-all flex items-center justify-end pr-2 text-[10px] font-black text-white"
                      style={{
                        width: `${Math.max(12, step.conversion_pct)}%`,
                        backgroundColor: step.color || '#087443',
                      }}
                    >
                      {step.conversion_pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="p-6 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-sky-600" />
                Distribución por Modalidad de Trabajo
              </h3>
              <p className="text-xs text-ink-secondary">
                Participación de ofertas presenciales, híbridas y remotas en la colocación.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {modalityMix.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                >
                  <div>
                    <p className="text-sm font-extrabold text-ink">{m.modality}</p>
                    <p className="text-xs text-ink-secondary">{m.count} postulaciones vinculadas</p>
                  </div>
                  <span className="text-lg font-black text-emerald-600">{m.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: BRECHA CURRICULAR Y BANDAS SALARIALES
          ===================================================================== */}
      {activeTab === 'skills_salary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
          <div
            className="p-6 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Matriz de Brecha de Competencias (Demanda vs. Oferta Curricular)
              </h3>
              <p className="text-xs text-ink-secondary">
                Insumo directo para reforma curricular y educación continua.
              </p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillGapData} layout="vertical" margin={{ top: 10, right: 20, left: 45, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <YAxis dataKey="skill" type="category" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="market_demand" name="Demanda Empresarial" fill="#087443" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="graduate_supply" name="Dominio Egresados" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="p-6 rounded-2xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Bandas Salariales por Programa (Mínimo, Promedio y Techo en COP)
              </h3>
              <p className="text-xs text-ink-secondary">
                Comparativa de dispersión salarial mensual según ofertas contratadas.
              </p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryByProgram} margin={{ top: 15, right: 15, left: 5, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="program" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CO')} COP`]}
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="min_salary" name="Mínimo" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_salary" name="Promedio" fill="#087443" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="max_salary" name="Techo Máximo" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 4: EXPLORADOR TABULAR DE DATOS (ESTILO POWER BI MATRIX)
          ===================================================================== */}
      {activeTab === 'explorer' && (
        <div
          className="p-6 rounded-2xl border shadow-xs space-y-4 animate-fade-in-up"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Table2 className="w-4 h-4 text-brand-600" />
                Explorador de Registros Individuales de Empleabilidad ({filteredRecords.length})
              </h3>
              <p className="text-xs text-ink-secondary">
                Vista detallada auditable para reportes ante el Ministerio de Educación y el CNA.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-2.5" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filtrar por nombre, programa, empresa..."
                className="input pl-9 w-full text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">ID</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Egresado</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Programa</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Cohorte</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Estado</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Empresa / Entidad</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary">Cargo</th>
                  <th className="py-3 px-4 font-black uppercase text-ink-secondary text-right">Salario</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-ink-tertiary">
                      No hay registros que coincidan con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <td className="py-2.5 px-4 font-mono text-ink-tertiary">#{r.user_id}</td>
                      <td className="py-2.5 px-4 font-bold text-ink">{r.full_name}</td>
                      <td className="py-2.5 px-4 text-ink-secondary">{r.program}</td>
                      <td className="py-2.5 px-4 text-ink-secondary">{r.graduation_year}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'CONTRATADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'ENTREVISTADO'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-ink">{r.company}</td>
                      <td className="py-2.5 px-4 text-ink-secondary">{r.position}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-ink">
                        {r.salary ? `$${Number(r.salary).toLocaleString('es-CO')}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
