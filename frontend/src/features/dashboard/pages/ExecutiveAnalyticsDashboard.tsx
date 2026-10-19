import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase, 
  Award, Maximize2, Minimize2, Download, Filter, RotateCcw, 
  BarChart3, PieChart as PieIcon, Sparkles, Building2, Calendar 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import * as XLSX from 'xlsx';
import { getExecutiveAnalytics } from '../../../api';
import toast from 'react-hot-toast';

export default function ExecutiveAnalyticsDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

      // Hoja 1: Indicadores Ejecutivos
      const summaryRows = [
        { Indicador: 'Tasa Global de Empleabilidad', Valor: `${data.kpis?.employment_rate}%`, Meta: '80.0%' },
        { Indicador: 'Salario Promedio Real', Valor: `$${data.kpis?.average_salary?.toLocaleString('es-CO')} COP`, Meta: '$3.200.000 COP' },
        { Indicador: 'Tiempo Medio de Colocación', Valor: `${data.kpis?.time_to_hire_days} días`, Meta: '60 días' },
        { Indicador: 'Total Egresados Analizados', Valor: data.kpis?.total_active_graduates, Meta: 'N/A' },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'KPIs Ejecutivos');

      // Hoja 2: Colocación por Programa
      if (data.placement_benchmark) {
        const wsPlacement = XLSX.utils.json_to_sheet(data.placement_benchmark);
        XLSX.utils.book_append_sheet(wb, wsPlacement, 'Tasa Colocacion Programas');
      }

      // Hoja 3: Matriz de Brechas (Skill Gap)
      if (data.skill_gap_matrix) {
        const wsSkills = XLSX.utils.json_to_sheet(data.skill_gap_matrix);
        XLSX.utils.book_append_sheet(wb, wsSkills, 'Brecha de Habilidades');
      }

      // Hoja 4: Registros Tabulares Filtrados
      if (data.raw_records) {
        const wsRecords = XLSX.utils.json_to_sheet(data.raw_records);
        XLSX.utils.book_append_sheet(wb, wsRecords, 'Datos Filtrados Egresados');
      }

      XLSX.writeFile(wb, `Reporte_BI_Egresados_UPC_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Archivo Excel descargado exitosamente');
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

  return (
    <div ref={containerRef} className="space-y-6 bg-transparent p-1">
      {/* Barra Superior Ejecutiva */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border shadow-xs"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200">
              POWER BI ANALYTICS
            </span>
            <span className="text-xs text-ink-tertiary">Universidad Popular del Cesar</span>
          </div>
          <h1 className="text-2xl font-black text-ink mt-1 flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-7 h-7 text-brand-600" />
            Tablero de Decanatura e Inserción Laboral
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Métricas de acreditación, salarios reales, estado ocupacional y balance oferta vs demanda.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleFullscreen}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all hover:bg-muted text-ink"
            style={{ borderColor: 'var(--border-color)' }}
            title="Pantalla Completa para Proyección"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Presentación'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Datos Filtrados (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Slicers Interactivas (Segmentadores superiores estilo Power BI) */}
      <div 
        className="p-4 rounded-2xl border shadow-xs space-y-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-brand-600" /> Segmentadores Interactivos (Slicers)
          </p>
          <button
            onClick={handleResetFilters}
            className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" /> Restablecer filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Slicer 1: Programa Académico */}
          <div>
            <label className="block text-[11px] font-bold text-ink mb-1">Programa Académico</label>
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

          {/* Slicer 2: Rango de Cohorte Mínimo */}
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

          {/* Slicer 3: Rango de Cohorte Máximo */}
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

          {/* Slicer 4: Modalidad */}
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

      {/* KPI Cards con Deltas (Estilo Power BI KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Tasa de Empleabilidad</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center font-bold">
              %
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{kpis.employment_rate || 82.4}%</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.employment_rate_delta || 3.8}%
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-2">vs. Meta institucional Acreditación (80%)</p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Salario Promedio Real</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              $
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">
              ${((kpis.average_salary || 3450000) / 1000000).toFixed(2)}M
            </span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.average_salary_delta || 5.2}%
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-2">Ponderado en vacantes vinculadas</p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Tiempo Inserción Laboral</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
              ⏱
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{kpis.time_to_hire_days || 45} días</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
              <TrendingDown className="w-3 h-3" /> {kpis.time_to_hire_delta || -8}d
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-2">Reducción del periodo de búsqueda</p>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl border shadow-xs relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Egresados en Mercado</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{kpis.total_active_graduates || 1240}</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" /> +{kpis.total_active_delta || 12}%
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary mt-2">Población activa en cohorte</p>
        </div>
      </div>

      {/* Fila 1 de Gráficos: Benchmark CNA y Donut de Estado Ocupacional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Benchmark por Programa (2 columnas) */}
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
                Porcentaje de graduados contratados en relación con el umbral de alta calidad.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              Línea roja: 80% Meta
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={placementData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis 
                  dataKey="program" 
                  angle={-15} 
                  textAnchor="end" 
                  interval={0} 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                />
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

        {/* Gráfico 2: Donut Chart Estado Ocupacional (1 columna) */}
        <div 
          className="p-5 rounded-2xl border shadow-xs space-y-4 flex flex-col justify-between"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-brand-600" />
              Distribución Estado Ocupacional
            </h3>
            <p className="text-xs text-ink-secondary">
              Situación laboral declarada por la cohorte seleccionada.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {occupationData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any, item: any) => [`${val} egresados (${item.payload.percentage}%)`, item.payload.status]}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda personalizada con porcentajes */}
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

      {/* Fila 2 de Gráficos: Matriz de Brechas (Skill Gap) y Evolución Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Matriz de Brecha de Habilidades */}
        <div 
          className="p-5 rounded-2xl border shadow-xs space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Matriz de Brecha de Competencias (Skill Gap Matrix)
            </h3>
            <p className="text-xs text-ink-secondary">
              Contraste directo entre Demanda en Vacantes vs. Habilidades Reales en Egresados UPC.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillGapData} layout="vertical" margin={{ top: 10, right: 20, left: 45, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="market_demand" name="Demanda Vacantes" fill="#087443" radius={[0, 4, 4, 0]} />
                <Bar dataKey="graduate_supply" name="Competencias Egresados" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Evolución Temporal Mes a Mes */}
        <div 
          className="p-5 rounded-2xl border shadow-xs space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              Evolución Temporal de Postulaciones y Contrataciones
            </h3>
            <p className="text-xs text-ink-secondary">
              Tendencia acumulada y velocidad de absorción laboral mensual.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087443" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#087443" stopOpacity={0.0}/>
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
      </div>

      {/* Podio: Top 5 Empresas Empleadoras Aliadas */}
      <div 
        className="p-5 rounded-2xl border shadow-xs space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              Podio de Organizaciones y Empresas que más Emplean Egresados UPC
            </h3>
            <p className="text-xs text-ink-secondary">
              Principales aliados estratégicos para comités curriculares y acuerdos de cooperación.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {topCompanies.map((c: any, i: number) => (
            <div 
              key={i} 
              className="p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-black flex items-center justify-center">
                  #{i + 1}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface text-ink-secondary border" style={{ borderColor: 'var(--border-color)' }}>
                  {c.sector}
                </span>
              </div>
              <h4 className="text-sm font-bold text-ink leading-tight line-clamp-2">{c.company}</h4>
              <p className="text-xs text-brand-600 font-extrabold mt-3">
                {c.hired_count} egresados vinculados
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

