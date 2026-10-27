import { useEffect, useState } from 'react';
import {
  Trophy, Users, TrendingUp, Sparkles, AlertCircle, CheckCircle2,
  Zap, RefreshCw, BarChart3, ShieldCheck
} from 'lucide-react';
import { getApplicantBenchmark, type ApplicantBenchmark } from '../../../api/aiServices';
import { graduatesApi } from '../../../api';
import toast from 'react-hot-toast';

interface ApplicantBenchmarkCardProps {
  jobOfferId: number;
  jobTitle?: string;
}

export default function ApplicantBenchmarkCard({ jobOfferId, jobTitle }: ApplicantBenchmarkCardProps) {
  const [data, setData] = useState<ApplicantBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);

  const loadBenchmark = async (includeAi = true) => {
    try {
      setLoading(true);
      const res = await getApplicantBenchmark(jobOfferId, includeAi);
      setData(res.data);
    } catch (err) {
      console.error('Error loading applicant benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobOfferId) {
      loadBenchmark(true);
    }
  }, [jobOfferId]);

  const handleQuickAddSkill = async (skillName: string, level?: string | null) => {
    try {
      setAddingSkill(skillName);
      await graduatesApi.post('/profile/skills/quick-add', {
        skill_name: skillName,
        proficiency_level: level || 'Intermedio',
      });
      toast.success(`"${skillName}" agregada a tu perfil. Recalculando tu posición...`);
      await loadBenchmark(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo agregar la habilidad');
    } finally {
      setAddingSkill(null);
    }
  };

  if (loading) {
    return (
      <div
        className="p-6 rounded-3xl border shadow-sm space-y-4 animate-pulse"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="h-6 w-72 bg-slate-200 dark:bg-neutral-800 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-neutral-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-neutral-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-neutral-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className="p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden space-y-6"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Exclusivo UPC · Tiempo Real
              </span>
              {data.ai_tips && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                  {data.ai_tips.source === 'groq' ? 'IA · Groq' : 'Motor Analítico UPC'}
                </span>
              )}
            </div>
            <h3 className="text-xl font-extrabold mt-1" style={{ color: 'var(--text-main)' }}>
              Radiografía de Competencia en Vivo
            </h3>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Comparativa anónima frente a los {data.total_applicants} candidatos de {jobTitle || data.job_title}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadBenchmark(true)}
          className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:border-brand-500 transition-colors self-start sm:self-auto"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar ranking
        </button>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-gradient-to-br from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/80">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[11px] font-black uppercase tracking-wider">Tu Posición</span>
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-white mt-1">
            #{data.my_rank} <span className="text-sm font-bold text-emerald-700">de {data.total_applicants}</span>
          </p>
          <span className="inline-block mt-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
            {data.competitiveness} (Percentil {data.percentile})
          </span>
        </div>

        <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Tu Afinidad
          </span>
          <p className="text-2xl font-black text-brand-600 mt-1">{Math.round(data.my_score)}%</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Puntaje algorítmico integral
          </p>
        </div>

        <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Promedio Vacante
          </span>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
            {data.avg_score !== null ? `${Math.round(data.avg_score)}%` : 'N/A'}
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Mediana: {data.median_score !== null ? `${Math.round(data.median_score)}%` : 'N/A'}
          </p>
        </div>

        <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
          <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Mejor Postulante
          </span>
          <p className="text-2xl font-black text-sky-600 mt-1">
            {data.top_score !== null ? `${Math.round(data.top_score)}%` : 'N/A'}
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Techo competitivo actual
          </p>
        </div>
      </div>

      {/* Criterion Breakdown Bars (Tú vs Promedio vs Top) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Desglose Comparativo por Dimensión
          </h4>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Tú
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Promedio
            </span>
            <span className="flex items-center gap-1.5 text-sky-600">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Top Candidato
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.breakdown.map((b) => (
            <div
              key={b.key}
              className="p-4 rounded-2xl border space-y-3"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold" style={{ color: 'var(--text-main)' }}>{b.label}</span>
                <span className="text-xs font-black text-emerald-600">{Math.round(b.mine)}%</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                    <span>Tu perfil</span>
                    <span>{Math.round(b.mine)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${Math.min(100, b.mine)}%` }} />
                  </div>
                </div>

                {b.avg !== null && (
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-ink-tertiary mb-0.5">
                      <span>Promedio grupo</span>
                      <span>{Math.round(b.avg)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, b.avg)}%` }} />
                    </div>
                  </div>
                )}

                {b.top !== null && (
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-ink-tertiary mb-0.5">
                      <span>Líder de la vacante</span>
                      <span>{Math.round(b.top)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${Math.min(100, b.top)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brechas de Habilidades con botón de agregar en 1 clic + Palancas de mejora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Habilidades Solicitadas que Aún No Registras
          </h4>
          {data.my_gaps.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ¡Excelente! Cumples con todas las habilidades técnicas declaradas en la oferta.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-secondary">
                Si ya dominas alguna de estas competencias, agrégala con un clic para recalcular tu posición en vivo:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {data.my_gaps.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={addingSkill === g.skill}
                    onClick={() => handleQuickAddSkill(g.skill, g.required_level)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-emerald-50 text-amber-900 hover:text-emerald-800 border border-amber-200 hover:border-emerald-300 transition-all flex items-center gap-1.5"
                  >
                    <span>+ {g.skill}</span>
                    {g.required_level && <span className="text-[10px] opacity-75">({g.required_level})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.strengths.length > 0 && (
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Tus Ventajas Competitivas
              </span>
              {data.strengths.map((st, idx) => (
                <p key={idx} className="text-xs text-ink-secondary flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{st}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Palancas de mejora con ganancia estimada */}
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-brand-700">
            <Zap className="w-4 h-4 text-brand-600" /> Simulaciones de Impacto en tu Ranking
          </h4>
          <div className="space-y-2.5">
            {data.improvement_levers.map((lev, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border flex items-center justify-between gap-3"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{lev.title}</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5">{lev.detail}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black shrink-0">
                  +{lev.estimated_gain} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consejos Estratégicos de IA (Groq) */}
      {data.ai_tips && (
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.06))',
            borderColor: 'rgba(16,185,129,0.28)',
          }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Estrategia Personalizada del Copiloto IA para esta Vacante
            </h4>
            <span className="text-[10px] font-bold text-emerald-700">
              {data.ai_tips.source === 'groq' ? 'Generado con Groq LLM' : 'Análisis Estratégico'}
            </span>
          </div>
          <p className="text-xs font-semibold text-ink leading-relaxed">{data.ai_tips.summary}</p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {data.ai_tips.tips.map((tip, idx) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-white/80 dark:bg-neutral-900/70 border border-emerald-200/60 text-xs text-ink-secondary leading-relaxed"
              >
                <strong className="text-emerald-700 block mb-0.5">Acción #{idx + 1}</strong>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Distribución del Embudo de Competidores + Nota de Privacidad */}
      <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-ink-secondary flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-brand-600" /> Estado actual de los postulantes:
          </span>
          {data.stage_distribution.map((st, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted border"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              {st.status}: {st.count}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-ink-tertiary flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Benchmarking 100% anónimo y agregado
        </span>
      </div>
    </div>
  );
}

