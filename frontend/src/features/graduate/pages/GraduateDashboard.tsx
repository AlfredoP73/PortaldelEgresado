import { useEffect, useState } from 'react';
import { getGraduateDashboard } from '../../../api/dashboardServices';
import type { GraduateDashboardData } from '../../../api/dashboardServices';
import { FileText, Eye, Target, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  LabelList,
} from 'recharts';
import { useTranslation } from '../../../context/LanguageContext';

export default function GraduateDashboard() {
  const [data, setData] = useState<GraduateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashboardData = await getGraduateDashboard();
      setData(dashboardData);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink-secondary">Cargando datos...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-ink-secondary">No hay datos disponibles todavía.</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl text-ink hover:bg-[var(--bg-hover)] transition-colors">
          Intentar nuevamente
        </button>
      </div>
    );
  }

  const { summary, applications_by_status, skills_radar, applications_timeline, market_salaries } = data;

  const KPI_ICONS = [FileText, Target, Eye, Target];

  const kpis = [
    { title: t('graduate_dash.my_applications'), value: summary.total_applications, description: t('graduate_dash.my_applications_desc') },
    { title: t('graduate_dash.response_rate'), value: `${summary.response_rate}%`, description: t('graduate_dash.response_rate_desc') },
    { title: t('graduate_dash.profile_views'), value: summary.profile_views, description: t('graduate_dash.profile_views_desc') },
    { title: t('graduate_dash.salary_exp'), value: `$${summary.expected_salary.toLocaleString()}`, description: t('graduate_dash.salary_exp_desc') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <h1 className="page-title">{t('graduate_dash.title')}</h1>
        <button onClick={fetchData} className="btn-outline p-2" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = KPI_ICONS[idx];
          return (
            <div key={idx} className="card p-6">
              <div className="flex items-start justify-between">
                <p className="label-upper">{kpi.title}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                  <Icon className="w-5 h-5" style={{ color: '#15803d' }} />
                </span>
              </div>
              <p className="kpi-value mt-3">{kpi.value}</p>
              <p className="mt-2 text-xs text-ink-tertiary">{kpi.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Radar de Habilidades */}
        <section className="card p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{t('graduate_dash.skills_vs_market')}</h2>
            <p className="mt-1 text-xs text-ink-secondary">{t('graduate_dash.skills_vs_market_desc')}</p>
          </div>
          {skills_radar?.length ? (
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skills_radar}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Mi Perfil" dataKey="graduate" stroke="var(--color-brand-500)" fill="var(--color-brand-500)" fillOpacity={0.6} />
                  <Radar name="Promedio del Mercado" dataKey="market" stroke="var(--color-brand-300)" fill="var(--color-brand-300)" fillOpacity={0.4} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-main)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center"><p className="text-sm text-ink-secondary">No hay datos disponibles.</p></div>
          )}
        </section>

        {/* Evolución Mensual */}
        <section className="card p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{t('graduate_dash.timeline')}</h2>
            <p className="mt-1 text-xs text-ink-secondary">{t('graduate_dash.timeline_desc')}</p>
          </div>
          {applications_timeline?.length ? (
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={applications_timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-main)' }} />
                  <Area type="monotone" dataKey="count" stroke="var(--color-brand-500)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center"><p className="text-sm text-ink-secondary">No hay datos disponibles.</p></div>
          )}
        </section>

        {/* Salarios del Mercado */}
        <section className="card p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Distribución Salarial (Mi Programa)</h2>
            <p className="mt-1 text-xs text-ink-secondary">Rangos de salario en el mercado</p>
          </div>
          {market_salaries?.length ? (
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={market_salaries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="range" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} angle={-25} textAnchor="end" />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-main)' }} />
                  <Bar dataKey="count" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} maxBarSize={55}>
                    <LabelList dataKey="count" position="top" fill="var(--text-secondary)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center"><p className="text-sm text-ink-secondary">No hay datos disponibles.</p></div>
          )}
        </section>

        {/* Estado de mis Postulaciones */}
        <section className="card p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Estado de mis Postulaciones</h2>
            <p className="mt-1 text-xs text-ink-secondary">Proporción de estatus</p>
          </div>
          {applications_by_status?.length ? (
             <div className="mt-4 grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_1.5fr]">
               <div className="h-[240px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadialBarChart
                     cx="50%"
                     cy="50%"
                     innerRadius="35%"
                     outerRadius="90%"
                     barSize={22}
                     data={applications_by_status.map((item, index) => ({
                       ...item,
                       fill: index % 2 === 0 ? 'var(--color-brand-500)' : 'var(--color-brand-300)',
                     }))}
                     startAngle={90}
                     endAngle={-270}
                   >
                     <PolarGrid gridType="circle" stroke="var(--border-color)" />
                     <RadialBar background={{ fill: 'var(--bg-muted)' }} dataKey="count" cornerRadius={10} />
                     <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-main)' }} />
                   </RadialBarChart>
                 </ResponsiveContainer>
               </div>
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                 {applications_by_status.map((item, index) => {
                   const total = applications_by_status.reduce((sum, i) => sum + i.count, 0);
                   const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                   return (
                     <div key={item.status} className="rounded-xl border border-black/5 bg-[var(--bg-surface-soft)] p-4">
                       <div className="flex items-center gap-2">
                         <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: index % 2 === 0 ? 'var(--color-brand-500)' : 'var(--color-brand-300)' }} />
                         <span className="text-xs font-medium uppercase text-ink-secondary">{item.status}</span>
                       </div>
                       <p className="mt-2 text-3xl font-semibold text-ink">{percentage}%</p>
                       <p className="mt-1 text-xs text-ink-secondary">
                         {item.count} {item.count === 1 ? 'postulación' : 'postulaciones'}
                       </p>
                     </div>
                   );
                 })}
               </div>
             </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center"><p className="text-sm text-ink-secondary">No hay datos disponibles.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}