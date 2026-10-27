import { useEffect, useState } from 'react';
import {
  X, ShieldCheck, Sparkles, Award, Briefcase, GraduationCap,
  FolderGit2, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, EyeOff, Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getBlindProfile,
  getBlindAiSummary,
  type BlindProfile,
  type BlindAiSummary,
} from '../../../api/aiServices';

interface BlindCandidateModalProps {
  applicationId: number;
  onClose: () => void;
  onOpenFullModal?: (appId: number) => void;
}

export default function BlindCandidateModal({
  applicationId,
  onClose,
  onOpenFullModal,
}: BlindCandidateModalProps) {
  const [profile, setProfile] = useState<BlindProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [aiSummary, setAiSummary] = useState<BlindAiSummary | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [applicationId]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const [profRes, sumRes] = await Promise.all([
        getBlindProfile(applicationId),
        getBlindAiSummary(applicationId, false).catch(() => null),
      ]);
      setProfile(profRes.data);
      if (sumRes?.data) {
        setAiSummary(sumRes.data);
      }
    } catch (err) {
      toast.error('No se pudo cargar el perfil anonimizado');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleGenerateAiSummary = async (force = false) => {
    try {
      setLoadingAi(true);
      const res = await getBlindAiSummary(applicationId, force);
      setAiSummary(res.data);
      toast.success('Dictamen Ejecutivo IA generado sin sesgos');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al generar el dictamen con IA');
    } finally {
      setLoadingAi(false);
    }
  };

  const fitBadgeColor = (label?: string) => {
    if (label === 'Alto') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (label === 'Medio') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden my-8 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <EyeOff className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  Modo Anti-Sesgo · Blind Hiring
                </span>
                {profile?.identity_revealed && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Etapa avanzada: Identidad desbloqueada
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1">
                {profile?.alias || `Candidato UPC #${applicationId}`}
              </h2>
              <p className="text-xs text-emerald-100/90">
                Evaluación basada 100% en méritos, competencias verificadas y proyectos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile?.match_score !== undefined && profile?.match_score !== null && (
              <div className="text-right bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15">
                <span className="block text-[10px] uppercase tracking-wider text-emerald-100">Afinidad</span>
                <span className="text-lg font-black text-white">{Math.round(profile.match_score)}%</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingProfile ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ink-secondary font-medium">Anonimizando expediente y verificando méritos...</p>
            </div>
          ) : !profile ? (
            <p className="text-center text-sm text-ink-secondary py-10">No se encontró información del candidato.</p>
          ) : (
            <>
              {/* AI Blind Candidate Synthesizer Card */}
              <div
                className="rounded-2xl border p-5 space-y-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(14,165,233,0.05))',
                  borderColor: 'rgba(16,185,129,0.3)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-ink">
                          Copiloto IA de Reclutamiento · Resumen Ejecutivo Ciego
                        </h3>
                        {aiSummary && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {aiSummary.source === 'groq' ? `IA · Groq (${aiSummary.model || 'Llama 3.3'})` : 'Motor Heurístico UPC'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary">
                        Síntesis imparcial de ajuste al cargo sin nombres, fotos, edad, género ni instituciones.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateAiSummary(true)}
                    disabled={loadingAi}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    {loadingAi ? 'Sintetizando con IA...' : aiSummary ? 'Regenerar Dictamen IA' : 'Generar Dictamen IA'}
                  </button>
                </div>

                {aiSummary && (
                  <div className="space-y-4 pt-2 border-t border-emerald-200/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-neutral-900/70 p-4 rounded-xl border border-emerald-200/60">
                      <p className="text-sm text-ink leading-relaxed flex-1 font-medium">
                        {aiSummary.executive_summary}
                      </p>
                      <div className={`px-3.5 py-2 rounded-xl border text-center shrink-0 ${fitBadgeColor(aiSummary.fit_label)}`}>
                        <span className="block text-[10px] font-black uppercase tracking-wider">Ajuste al Cargo</span>
                        <span className="text-lg font-black">{aiSummary.fit_label} · {aiSummary.fit_score}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-emerald-200/50 space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fortalezas Demostradas
                        </h4>
                        <ul className="space-y-1.5 text-xs text-ink-secondary">
                          {aiSummary.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-amber-200/60 space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> Brechas / Puntos a Validar
                        </h4>
                        <ul className="space-y-1.5 text-xs text-ink-secondary">
                          {aiSummary.gaps.map((g, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {aiSummary.interview_questions?.length > 0 && (
                      <div className="p-4 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-sky-200/60 space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-sky-600" /> Preguntas Sugeridas para Entrevista Estructurada
                        </h4>
                        <ol className="space-y-1.5 text-xs text-ink list-decimal list-inside">
                          {aiSummary.interview_questions.map((q, i) => (
                            <li key={i} className="leading-relaxed">{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{aiSummary.bias_guard}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* KPIs rápidos del perfil ciego */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border bg-muted/40" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Experiencia</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.experience_years} años</p>
                </div>
                <div className="p-3.5 rounded-xl border bg-muted/40" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Cohorte Grado</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.graduation_year || 'N/A'}</p>
                </div>
                <div className="p-3.5 rounded-xl border bg-muted/40" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Modalidad Pref.</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.preferred_modality || 'Cualquiera'}</p>
                </div>
                <div className="p-3.5 rounded-xl border bg-muted/40" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Aspiración Salarial</span>
                  <p className="text-base font-black text-ink mt-0.5">
                    {profile.expected_salary ? `$${profile.expected_salary.toLocaleString('es-CO')}` : 'A convenir'}
                  </p>
                </div>
              </div>

              {/* Resumen Profesional Saneado */}
              {profile.profile_summary && (
                <div className="p-4 rounded-2xl border space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary">Resumen Profesional (Anonimizado)</h4>
                  <p className="text-sm text-ink leading-relaxed">{profile.profile_summary}</p>
                </div>
              )}

              {/* Habilidades */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" /> Competencias y Habilidades Técnicas ({profile.skills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.length === 0 ? (
                    <span className="text-xs text-ink-tertiary">Sin habilidades registradas.</span>
                  ) : (
                    profile.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        {sk.name} {sk.level ? `· ${sk.level}` : ''}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Experiencia y Educación Anonimizadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-brand-600" /> Trayectoria Funcional (Empresas Ocultas)
                  </h4>
                  {profile.experiences.length === 0 ? (
                    <p className="text-xs text-ink-tertiary">Sin experiencias registradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {profile.experiences.map((exp, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-muted/50 border" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-ink">{exp.position}</span>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {exp.duration_months} meses {exp.is_current ? '· Actual' : ''}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
                    <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-brand-600" /> Títulos y Certificaciones
                    </h4>
                    {profile.education.map((edu, i) => (
                      <div key={i} className="text-xs flex items-center justify-between py-1 border-b last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="font-bold text-ink">{edu.degree}</span>
                        <span className="text-ink-tertiary">{edu.year_completed || ''}</span>
                      </div>
                    ))}
                    {profile.certifications.map((cert, i) => (
                      <div key={`c-${i}`} className="text-xs flex items-center justify-between py-1">
                        <span className="font-medium text-emerald-700">✦ {cert.name}</span>
                        <span className="text-ink-tertiary">{cert.year || ''}</span>
                      </div>
                    ))}
                  </div>

                  {profile.projects.length > 0 && (
                    <div className="p-4 rounded-2xl border space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
                      <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                        <FolderGit2 className="w-4 h-4 text-brand-600" /> Proyectos Demostrables
                      </h4>
                      {profile.projects.map((p, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-muted/40 space-y-1">
                          <p className="text-xs font-bold text-ink">{p.title}</p>
                          {p.description && <p className="text-[11px] text-ink-secondary">{p.description}</p>}
                          {p.technologies && (
                            <p className="text-[10px] font-bold text-brand-600">{p.technologies}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-xs text-ink-secondary flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            La identidad completa se desbloquea automáticamente al avanzar al candidato a <strong>ENTREVISTADO</strong> o <strong>CONTRATADO</strong>.
          </p>
          <div className="flex items-center gap-2">
            {onOpenFullModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullModal(applicationId);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-surface transition-colors text-ink"
                style={{ borderColor: 'var(--border-color)' }}
              >
                Gestionar Pruebas / Subprocesos
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

