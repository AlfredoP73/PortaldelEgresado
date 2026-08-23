import { CheckCircle2, Circle, ArrowRight, Zap } from 'lucide-react';
import { useTranslation } from '../../../context/LanguageContext';

interface Graduate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_summary?: string;
  cv_url?: string;
  profile_picture_url?: string;
  experiences?: any[];
  academic_histories?: any[];
  skills?: any[];
}

interface ProfileCompletenessProps {
  profile: Graduate | null;
  onAction?: (actionId: string) => void;
}

export default function ProfileCompleteness({ profile, onAction }: ProfileCompletenessProps) {
  const { t } = useTranslation();
  if (!profile) return null;

  const checks = [
    { id: 'basic', label: t('graduate_profile.basic_data'), points: 20, isComplete: !!(profile.first_name && profile.last_name && profile.phone && profile.profile_summary), action: 'Completa tu información personal y un resumen profesional.' },
    { id: 'photo', label: t('graduate_profile.profile_pic'), points: 15, isComplete: !!profile.profile_picture_url, action: t('graduate_profile.next_step_desc') },
    { id: 'cv', label: t('graduate_profile.cv'), points: 20, isComplete: !!profile.cv_url, action: 'Sube tu CV en formato PDF para que las empresas lo vean.' },
    { id: 'skills', label: t('graduate_profile.skills'), points: 25, isComplete: !!(profile.skills && profile.skills.length > 0), action: 'Añade al menos una habilidad técnica o blanda.' },
    { id: 'exp', label: t('graduate_profile.experience_and_acad'), points: 20, isComplete: !!((profile.experiences && profile.experiences.length > 0) || (profile.academic_histories && profile.academic_histories.length > 0)), action: 'Agrega tu experiencia laboral o historial académico.' },
  ];

  const totalPoints = checks.reduce((acc, curr) => acc + (curr.isComplete ? curr.points : 0), 0);
  const nextStep = checks.find(c => !c.isComplete);

  const getStrengthLabel = (pct: number) => {
    if (pct < 30) return { label: 'Perfil débil', color: '#ef4444' };
    if (pct < 60) return { label: t('graduate_profile.in_progress'), color: '#f59e0b' };
    if (pct < 90) return { label: 'Perfil sólido', color: '#22a86e' };
    return { label: '¡Perfil estelar!', color: '#10b981' };
  };

  const { label: strengthLabel, color: strengthColor } = getStrengthLabel(totalPoints);

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #22a86e, #45c388, #7cdaac)' }} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22a86e, #116e48)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink leading-none">{t('graduate_profile.strength')}</h3>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: strengthColor }}>{strengthLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black" style={{ color: strengthColor }}>{totalPoints}</span>
            <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full rounded-full mb-6 overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${totalPoints}%`, background: `linear-gradient(90deg, #22a86e, #45c388)` }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checklist */}
          <div className="space-y-2.5">
            {checks.map(check => (
              <div key={check.id}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 cursor-default"
                style={{ opacity: check.isComplete ? 1 : 0.75 }}>
                {check.isComplete
                  ? <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#22a86e' }}>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                }
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-sm font-semibold ${check.isComplete ? '' : 'line-through'}`}
                    style={{ color: check.isComplete ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {check.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: check.isComplete ? 'rgba(34,168,110,0.1)' : 'var(--bg-muted)', color: check.isComplete ? '#158a58' : 'var(--text-muted)' }}>
                    {check.points}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Next step card */}
          {nextStep ? (
            <div
              className="group relative overflow-hidden rounded-2xl p-5 flex flex-col justify-center cursor-pointer transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, rgba(34,168,110,0.08), rgba(21,138,88,0.05))', border: '1px solid rgba(34,168,110,0.2)' }}
              onClick={() => onAction && onAction(nextStep.id)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(34,168,110,0.13), rgba(21,138,88,0.09))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(34,168,110,0.08), rgba(21,138,88,0.05))'; }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(34,168,110,0.15), transparent)', filter: 'blur(20px)' }} />
              <h4 className="text-[10px] font-bold text-ink-secondary tracking-widest uppercase mb-1">{t('graduate_profile.next_step')}</h4>
              <p className="text-sm font-semibold leading-relaxed mb-4" style={{ color: 'var(--text-main)' }}>
                {nextStep.action}
              </p>
              <div className="flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all" style={{ color: '#22a86e' }}>
                {t('graduate_profile.complete_now')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 flex flex-col justify-center items-center text-center"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,168,110,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg, #22a86e, #116e48)' }}>
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h4 className="font-black text-lg mb-1" style={{ color: '#0e4832' }}>¡Perfil Estelar!</h4>
              <p className="text-sm leading-relaxed" style={{ color: '#158a58' }}>
                Tu perfil está completo. Tienes altas probabilidades de ser seleccionado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}