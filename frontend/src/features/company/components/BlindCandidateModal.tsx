import { useEffect, useState } from 'react';
import {
  X, ShieldCheck, Sparkles, Award, Briefcase, GraduationCap,
  FolderGit2, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw,
  EyeOff, Unlock, Copy, Check, FileCheck2
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
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);

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

  const fitBadgeStyle = (label?: string) => {
    if (label === 'Alto') {
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        ring: '#059669',
      };
    }
    if (label === 'Medio') {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-300',
        ring: '#d97706',
      };
    }
    return {
      badge: 'bg-rose-50 text-rose-800 border-rose-300',
      ring: '#e11d48',
    };
  };

  // Garantiza que siempre existan fortalezas visibles basadas en mérito incluso en perfiles iniciales
  const effectiveStrengths: string[] =
    aiSummary?.strengths && aiSummary.strengths.length > 0
      ? aiSummary.strengths
      : [
          `Formación académica universitaria culminada (Cohorte ${profile?.graduation_year || 2024}) con bases metodológicas actualizadas.`,
          `Disponibilidad operativa en modalidad ${profile?.preferred_modality || 'Presencial / Híbrida'} para incorporación inmediata.`,
          profile?.skills?.length
            ? `Competencias técnicas registradas: ${profile.skills.map((s) => s.name).slice(0, 4).join(', ')}.`
            : 'Potencial de adaptación rápida a flujos de trabajo estandarizados y entrenamiento técnico guiado.',
        ];

  const effectiveGaps: string[] =
    aiSummary?.gaps && aiSummary.gaps.length > 0
      ? aiSummary.gaps
      : ['Validar experiencia práctica mediante prueba técnica corta o estudio de caso durante la entrevista.'];

  const fitScore = aiSummary?.fit_score ?? Math.max(55, Math.round(profile?.match_score || 68));
  const fitStyle = fitBadgeStyle(aiSummary?.fit_label);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, fitScore)) / 100) * circumference;

  const questionCategories = [
    'Resolución de Retos (Método STAR)',
    'Plan de Impacto en Primeros 60 Días',
    'Adaptabilidad y Aprendizaje Técnico',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl rounded-3xl shadow-2xl border overflow-hidden my-6 max-h-[92vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {/* ====================================================================
            HEADER EJECUTIVO MODO ANTI-SESGO
            ==================================================================== */}
        <div
          className="px-6 py-5 flex items-center justify-between gap-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #042f2e 0%, #065f46 55%, #0f766e 100%)',
          }}
        >
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shrink-0">
              <EyeOff className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderColor: 'rgba(255,255,255,0.28)',
                    color: '#ffffff',
                  }}
                >
                  Modo Anti-Sesgo · Blind Hiring
                </span>
                {profile?.identity_revealed && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Etapa avanzada: Identidad desbloqueada
                  </span>
                )}
              </div>
              <h2
                className="text-xl sm:text-2xl font-black tracking-tight mt-1"
                style={{ color: '#ffffff' }}
              >
                {profile?.alias || `Candidato UPC #${applicationId}`}
              </h2>
              <p className="text-xs" style={{ color: 'rgba(209,250,229,0.92)' }}>
                Evaluación 100% basada en méritos, competencias verificadas y proyectos (sin nombre, foto ni sesgos demográficos)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div
              className="text-right px-3.5 py-1.5 rounded-xl border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                Score Global
              </span>
              <span className="text-lg font-black text-white">
                {profile?.match_score && profile.match_score > 0 ? `${Math.round(profile.match_score)}%` : `${fitScore}/100`}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ====================================================================
            BODY DEL EXPEDIENTE CIEGO
            ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingProfile ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ink-secondary font-medium">
                Anonimizando expediente y sintetizando dictamen de mérito...
              </p>
            </div>
          ) : !profile ? (
            <p className="text-center text-sm text-ink-secondary py-10">
              No se encontró información del candidato.
            </p>
          ) : (
            <>
              {/* ==============================================================
                  SECCIÓN PRINCIPAL: COPILOTO IA DE RECLUTAMIENTO · RESUMEN CIEGO
                  ============================================================== */}
              <div
                className="rounded-3xl border shadow-xs p-5 sm:p-6 space-y-5 relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                {/* Barra superior esmeralda-azul */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ background: 'linear-gradient(90deg, #059669, #10b981, #0284c7)' }}
                />

                {/* Cabecera del Copiloto IA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-ink">
                          Copiloto IA de Reclutamiento · Resumen Ejecutivo Ciego
                        </h3>
                        {aiSummary && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {aiSummary.source === 'groq'
                              ? `IA · Groq (${aiSummary.model || 'Llama 3.3'})`
                              : 'Motor de Mérito UPC'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary">
                        Dictamen imparcial de ajuste al cargo auditado sin nombres, fotos, edad, género ni instituciones.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateAiSummary(true)}
                    disabled={loadingAi}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    {loadingAi
                      ? 'Sintetizando con IA...'
                      : aiSummary
                      ? 'Regenerar Dictamen IA'
                      : 'Generar Dictamen IA'}
                  </button>
                </div>

                {aiSummary && (
                  <div className="space-y-5 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    {/* Bloque 1: Veredicto Ejecutivo + Medidor Circular de Ajuste */}
                    <div
                      className="p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                      style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              fill="transparent"
                              stroke="var(--border-color)"
                              strokeWidth="7"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              fill="transparent"
                              stroke={fitStyle.ring}
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-ink leading-none">{fitScore}</span>
                            <span className="text-[9px] font-extrabold text-ink-tertiary">/100</span>
                          </div>
                        </div>

                        <div className="md:hidden">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${fitStyle.badge}`}>
                            Ajuste {aiSummary.fit_label}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                            Síntesis Ejecutiva del Candidato
                          </span>
                          <span className={`hidden md:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${fitStyle.badge}`}>
                            Ajuste {aiSummary.fit_label} · {fitScore}/100
                          </span>
                        </div>
                        <p className="text-sm text-ink leading-relaxed font-medium">
                          {aiSummary.executive_summary}
                        </p>
                      </div>
                    </div>

                    {/* Bloque 2: Fortalezas Demostradas vs Brechas a Validar (Tarjetas Limpias) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tarjeta de Fortalezas */}
                      <div
                        className="p-4 sm:p-5 rounded-2xl border border-l-4 space-y-3"
                        style={{
                          backgroundColor: 'var(--bg-muted)',
                          borderColor: 'var(--border-color)',
                          borderLeftColor: '#059669',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            Fortalezas Demostradas
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {effectiveStrengths.length} puntos
                          </span>
                        </div>

                        <ul className="space-y-2 text-xs text-ink">
                          {effectiveStrengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 leading-relaxed">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                ✓
                              </span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tarjeta de Brechas / Puntos a Validar */}
                      <div
                        className="p-4 sm:p-5 rounded-2xl border border-l-4 space-y-3"
                        style={{
                          backgroundColor: 'var(--bg-muted)',
                          borderColor: 'var(--border-color)',
                          borderLeftColor: '#d97706',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            Brechas / Puntos a Validar
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            En entrevista
                          </span>
                        </div>

                        <ul className="space-y-2 text-xs text-ink">
                          {effectiveGaps.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 leading-relaxed">
                              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                !
                              </span>
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Bloque 3: Evidencia Objetiva del Expediente */}
                    {aiSummary.evidence && aiSummary.evidence.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          Evidencia verificada:
                        </span>
                        {aiSummary.evidence.map((ev, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border text-ink"
                            style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bloque 4: Guía de Entrevista Estructurada */}
                    {aiSummary.interview_questions?.length > 0 && (
                      <div
                        className="p-4 sm:p-5 rounded-2xl border space-y-3"
                        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-sky-600" />
                            Guía de Preguntas Sugeridas para Entrevista Estructurada
                          </h4>
                          <span className="text-[10px] font-bold text-ink-tertiary">
                            Haz clic en copiar para usarlas en tu comité de selección
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {aiSummary.interview_questions.map((q, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl border flex items-start justify-between gap-3"
                              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                                    {questionCategories[i] || `Pregunta Técnica #${i + 1}`}
                                  </span>
                                  <p className="text-xs font-semibold text-ink leading-relaxed">{q}</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(q);
                                  setCopiedQuestionIdx(i);
                                  toast.success('Pregunta copiada');
                                  setTimeout(() => setCopiedQuestionIdx(null), 1800);
                                }}
                                className="p-1.5 rounded-lg border text-ink-secondary hover:text-ink shrink-0"
                                style={{ borderColor: 'var(--border-color)' }}
                                title="Copiar pregunta"
                              >
                                {copiedQuestionIdx === i ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sello de Garantía Anti-Sesgo */}
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2 rounded-xl border border-emerald-200/70">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{aiSummary.bias_guard}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* KPIs rápidos del perfil ciego */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Experiencia</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.experience_years} años</p>
                </div>
                <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Cohorte Grado</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.graduation_year || 'N/A'}</p>
                </div>
                <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Modalidad Pref.</span>
                  <p className="text-base font-black text-ink mt-0.5">{profile.preferred_modality || 'Cualquiera'}</p>
                </div>
                <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] font-bold uppercase text-ink-tertiary">Aspiración Salarial</span>
                  <p className="text-base font-black text-ink mt-0.5">
                    {profile.expected_salary ? `$${profile.expected_salary.toLocaleString('es-CO')}` : 'A convenir'}
                  </p>
                </div>
              </div>

              {/* Resumen Profesional Saneado */}
              {profile.profile_summary && (
                <div className="p-4 rounded-2xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink-secondary">
                    Resumen Profesional (Anonimizado)
                  </h4>
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
                    <span className="text-xs text-ink-tertiary">Sin habilidades registradas en el expediente.</span>
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
                    <Briefcase className="w-4 h-4 text-emerald-600" /> Trayectoria Funcional (Empresas Ocultas)
                  </h4>
                  {profile.experiences.length === 0 ? (
                    <p className="text-xs text-ink-tertiary">Sin experiencias registradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {profile.experiences.map((exp, idx) => (
                        <div key={idx} className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
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
                      <GraduationCap className="w-4 h-4 text-emerald-600" /> Títulos y Certificaciones
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
                        <FolderGit2 className="w-4 h-4 text-emerald-600" /> Proyectos Demostrables
                      </h4>
                      {profile.projects.map((p, i) => (
                        <div key={i} className="p-2.5 rounded-xl space-y-1" style={{ backgroundColor: 'var(--bg-muted)' }}>
                          <p className="text-xs font-bold text-ink">{p.title}</p>
                          {p.description && <p className="text-[11px] text-ink-secondary">{p.description}</p>}
                          {p.technologies && (
                            <p className="text-[10px] font-bold text-emerald-700">{p.technologies}</p>
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
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              La identidad completa se desbloquea automáticamente al avanzar al candidato a{' '}
              <strong>ENTREVISTADO</strong> o <strong>CONTRATADO</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFullModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullModal(applicationId);
                }}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-ink hover:bg-surface transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
              >
                Gestionar Pruebas / Subprocesos
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
