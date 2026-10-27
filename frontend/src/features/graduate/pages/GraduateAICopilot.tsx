import { useEffect, useState } from 'react';
import {
  Sparkles, Wand2, MessageSquare, CheckCircle2, AlertTriangle,
  Plus, Copy, Check, Send, RefreshCw, Target, Award, Calendar, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  analyzeProfileWithAi,
  rewriteWithAi,
  chatWithCoach,
  type CoachAnalysis,
  type CoachRewrite,
  type CoachChatMessage,
} from '../../../api/aiServices';
import { graduatesApi } from '../../../api';

type CopilotTab = 'diagnosis' | 'rewriter' | 'chat';

export default function GraduateAICopilot() {
  const [activeTab, setActiveTab] = useState<CopilotTab>('diagnosis');

  // --- Tab 1: Diagnóstico 360° ---
  const [targetRole, setTargetRole] = useState('');
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [applyingSummary, setApplyingSummary] = useState(false);
  const [addingSkillName, setAddingSkillName] = useState<string | null>(null);

  // --- Tab 2: Reescritor STAR ---
  const [rewriteField, setRewriteField] = useState<'summary' | 'experience' | 'project' | 'headline' | 'cover_letter'>('summary');
  const [inputText, setInputText] = useState('');
  const [ctxPosition, setCtxPosition] = useState('');
  const [ctxCompany, setCtxCompany] = useState('');
  const [rewriteResult, setRewriteResult] = useState<CoachRewrite | null>(null);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Tab 3: Coach Conversacional ---
  const [messages, setMessages] = useState<CoachChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy tu Copiloto IA de Empleabilidad UPC. Conozco tu perfil académico, habilidades y proyectos. ¿En qué trabajamos hoy: optimizar tu resumen, preparar una entrevista o subir tu afinidad con vacantes?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    '¿Cómo mejoro mi resumen profesional para pasar filtros ATS?',
    '¿Qué habilidades me recomiendas agregar según mi carrera?',
    'Prepárame 3 respuestas con método STAR para entrevista',
  ]);

  const runAnalysis = async (role?: string) => {
    try {
      setLoadingAnalysis(true);
      const res = await analyzeProfileWithAi(role);
      setAnalysis(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo ejecutar el diagnóstico IA');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const handleApplySummaryToProfile = async (textToApply: string) => {
    try {
      setApplyingSummary(true);
      const profRes = await graduatesApi.get('/profile');
      const current = profRes.data || {};
      await graduatesApi.post('/profile', {
        first_name: current.first_name,
        last_name: current.last_name,
        program_id: current.program_id,
        graduation_year: current.graduation_year,
        phone: current.phone,
        profile_summary: textToApply,
      });
      toast.success('¡Resumen profesional actualizado en tu perfil oficial!');
      runAnalysis(targetRole || undefined);
    } catch (err) {
      toast.error('No se pudo aplicar el resumen al perfil');
    } finally {
      setApplyingSummary(false);
    }
  };

  const handleQuickAddSkill = async (skillName: string) => {
    try {
      setAddingSkillName(skillName);
      await graduatesApi.post('/profile/skills/quick-add', {
        skill_name: skillName,
        proficiency_level: 'Intermedio',
      });
      toast.success(`Habilidad "${skillName}" añadida a tu perfil`);
      runAnalysis(targetRole || undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al agregar habilidad');
    } finally {
      setAddingSkillName(null);
    }
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      toast.error('Escribe o pega un texto base para mejorar con IA');
      return;
    }
    try {
      setLoadingRewrite(true);
      const res = await rewriteWithAi({
        field: rewriteField,
        text: inputText,
        context: { position: ctxPosition, company: ctxCompany },
      });
      setRewriteResult(res.data);
      toast.success('Texto optimizado con metodología STAR');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al reescribir con IA');
    } finally {
      setLoadingRewrite(false);
    }
  };

  const handleSendChat = async (textToSend?: string) => {
    const content = (textToSend ?? chatInput).trim();
    if (!content || sendingChat) return;

    const nextMessages: CoachChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setChatInput('');
    try {
      setSendingChat(true);
      const res = await chatWithCoach(nextMessages);
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }]);
      if (res.data.suggestions?.length) {
        setSuggestions(res.data.suggestions);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al consultar al Copiloto IA');
    } finally {
      setSendingChat(false);
    }
  };

  const statusColor = (st: string) => {
    if (st === 'excellent') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (st === 'good') return 'bg-sky-100 text-sky-800 border-sky-300';
    if (st === 'improve') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* Hero Banner */}
      <div
        className="p-6 rounded-3xl border shadow-sm relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #087443 55%, #0d9488 100%)',
          borderColor: 'rgba(16,185,129,0.4)',
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-white">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-sm">
                COPILOTO IA DE EMPLEABILIDAD · GROQ LLM
              </span>
              {analysis && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 border border-emerald-200/30">
                  {analysis.source === 'groq' ? `Conectado a Groq (${analysis.model})` : 'Motor Experto Activo'}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-8 h-8 text-emerald-200 shrink-0" />
              Potencia tu Perfil Profesional en Todos los Aspectos
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
              Auditoría 360° de tu perfil, reescritor con metodología STAR para experiencias y cartas de presentación, y mentor conversacional 24/7.
            </p>
          </div>

          {/* Tabs Selector */}
          <div className="flex flex-wrap gap-2 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/15 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'diagnosis' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Target className="w-4 h-4" /> Diagnóstico 360°
            </button>
            <button
              onClick={() => setActiveTab('rewriter')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'rewriter' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Wand2 className="w-4 h-4" /> Reescritor STAR
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'chat' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Coach IA
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 1: DIAGNÓSTICO 360°
          ==================================================================== */}
      {activeTab === 'diagnosis' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Barra de Rol Objetivo */}
          <div
            className="p-5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-secondary mb-1">
                ¿A qué cargo o rol profesional aspiras? (Opcional — personaliza el diagnóstico IA)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Ej. Desarrollador Backend Cloud, Analista Financiero Senior, Coordinador Clínico..."
                className="input w-full text-xs"
              />
            </div>
            <button
              onClick={() => runAnalysis(targetRole || undefined)}
              disabled={loadingAnalysis}
              className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 sm:mt-4 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAnalysis ? 'animate-spin' : ''}`} />
              {loadingAnalysis ? 'Analizando perfil...' : 'Evaluar con IA'}
            </button>
          </div>

          {loadingAnalysis ? (
            <div className="p-16 rounded-3xl border text-center space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-ink">Auditando las 7 dimensiones de tu perfil profesional...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Score Global + Resumen Sugerido */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className="p-6 rounded-3xl border flex flex-col justify-between space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-ink-secondary">
                      Índice de Competitividad
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Nivel {analysis.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 py-2">
                    <div className="w-24 h-24 rounded-full border-8 border-emerald-600 flex flex-col items-center justify-center shrink-0">
                      <span className="text-2xl font-black text-ink">{analysis.overall_score}</span>
                      <span className="text-[10px] font-bold text-ink-tertiary">/ 100</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-ink leading-snug">{analysis.headline}</p>
                      <p className="text-xs text-emerald-700 font-semibold">
                        Titular sugerido: "{analysis.suggested_headline}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary block">
                      Palabras Clave ATS Detectadas / Recomendadas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-muted text-ink border" style={{ borderColor: 'var(--border-color)' }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumen Profesional Redactado por IA con aplicación en 1 clic */}
                <div
                  className="lg:col-span-2 p-6 rounded-3xl border flex flex-col justify-between space-y-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(14,165,233,0.04))',
                    borderColor: 'rgba(16,185,129,0.3)',
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        Resumen Ejecutivo Optimizado por IA para tu Perfil
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-700">Basado en tus datos reales UPC</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed p-4 rounded-2xl bg-white/85 dark:bg-neutral-900/75 border border-emerald-200/70 italic">
                      "{analysis.improved_summary}"
                    </p>
                  </div>

                  {/* Victorias rápidas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysis.quick_wins.map((qw, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/80 dark:bg-neutral-900/70 border space-y-1"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-emerald-700">Victoria Rápida #{idx + 1}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Impacto {qw.impact === 'high' ? 'Alto' : 'Medio'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-ink">{qw.title}</p>
                        <p className="text-[11px] text-ink-secondary">{qw.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(analysis.improved_summary);
                        setRewriteField('summary');
                        setActiveTab('rewriter');
                      }}
                      className="px-4 py-2 rounded-xl border text-xs font-bold text-ink hover:bg-surface transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      Personalizar en el Reescritor
                    </button>
                    <button
                      type="button"
                      disabled={applyingSummary}
                      onClick={() => handleApplySummaryToProfile(analysis.improved_summary)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {applyingSummary ? 'Guardando en tu perfil...' : 'Aplicar este resumen a mi perfil en 1 clic'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Evaluación de las 7 Secciones del Perfil */}
              <div
                className="p-6 rounded-3xl border space-y-4"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <h3 className="text-base font-extrabold text-ink">
                  Desglose de las 7 Dimensiones de tu Perfil Profesional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.sections.map((sec) => (
                    <div
                      key={sec.key}
                      className="p-4 rounded-2xl border space-y-2.5 flex flex-col justify-between"
                      style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-ink">{sec.label}</span>
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${statusColor(sec.status)}`}>
                            {sec.score}/100
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${sec.score}%` }}
                          />
                        </div>
                        {sec.findings.map((f, i) => (
                          <p key={i} className="text-xs text-ink-secondary">{f}</p>
                        ))}
                      </div>
                      {sec.actions.length > 0 && (
                        <div className="pt-2 border-t text-[11px] font-semibold text-emerald-700 flex items-start gap-1.5" style={{ borderColor: 'var(--border-color)' }}>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{sec.actions[0]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Habilidades recomendadas para añadir en 1 clic + Plan de 30 Días */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                  className="p-6 rounded-3xl border space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-600" />
                      Habilidades Sugeridas para Subir tu Matchmaking
                    </h3>
                    <span className="text-[11px] font-bold text-ink-tertiary">Agregar en 1 clic</span>
                  </div>
                  <div className="space-y-3">
                    {analysis.skills_to_add.map((sk, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                      >
                        <div>
                          <p className="text-xs font-extrabold text-ink">{sk.name}</p>
                          <p className="text-[11px] text-ink-secondary mt-0.5">{sk.reason}</p>
                        </div>
                        <button
                          type="button"
                          disabled={addingSkillName === sk.name}
                          onClick={() => handleQuickAddSkill(sk.name)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-300 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="p-6 rounded-3xl border space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-600" />
                    Plan de Acción de Empleabilidad a 30 Días
                  </h3>
                  <div className="space-y-3">
                    {analysis.plan_30_days.map((wk) => (
                      <div
                        key={wk.week}
                        className="p-3.5 rounded-2xl border space-y-1.5"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-700 text-white">
                            Semana {wk.week}
                          </span>
                          <span className="text-xs font-extrabold text-ink">{wk.goal}</span>
                        </div>
                        <ul className="space-y-1 pl-4 list-disc text-xs text-ink-secondary">
                          {wk.tasks.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ====================================================================
          TAB 2: REESCRITOR INTELIGENTE STAR
          ==================================================================== */}
      {activeTab === 'rewriter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-emerald-600" />
              Texto Original a Transformar
            </h3>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'summary', label: 'Resumen Profesional' },
                { id: 'experience', label: 'Experiencia Laboral (STAR)' },
                { id: 'project', label: 'Proyecto de Portafolio' },
                { id: 'cover_letter', label: 'Carta de Presentación' },
                { id: 'headline', label: 'Titular de Perfil' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRewriteField(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    rewriteField === f.id
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-transparent text-ink-secondary border-[var(--border-color)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary mb-1">Cargo / Rol (Opcional)</label>
                <input
                  type="text"
                  value={ctxPosition}
                  onChange={(e) => setCtxPosition(e.target.value)}
                  placeholder="Ej. practicante de desarrollo..."
                  className="input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary mb-1">Empresa / Entidad (Opcional)</label>
                <input
                  type="text"
                  value={ctxCompany}
                  onChange={(e) => setCtxCompany(e.target.value)}
                  placeholder="Ej. Clínica del Cesar / TechCaribe..."
                  className="input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-secondary mb-1">
                Escribe tus funciones, ideas o borrador actual
              </label>
              <textarea
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ej. Hice reportes en Excel, apoyé en el desarrollo de una API con Python y atendí usuarios..."
                className="input w-full text-xs leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleRewrite}
              disabled={loadingRewrite}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Sparkles className={`w-4 h-4 ${loadingRewrite ? 'animate-spin' : ''}`} />
              {loadingRewrite ? 'Reescribiendo con IA (Método STAR)...' : 'Optimizar Redacción con IA'}
            </button>
          </div>

          <div
            className="p-6 rounded-3xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            {rewriteResult ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Versión Mejorada de Alto Impacto
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rewriteResult.source === 'groq' ? 'IA · Groq' : 'Motor STAR UPC'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 text-sm text-ink leading-relaxed whitespace-pre-line">
                    {rewriteResult.improved}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-ink-secondary">
                      Mejoras aplicadas:
                    </span>
                    <ul className="space-y-1 text-xs text-ink-secondary">
                      {rewriteResult.changes.map((c, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {rewriteResult.warnings?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{rewriteResult.warnings[0]}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(rewriteResult.improved);
                      setCopied(true);
                      toast.success('Texto copiado al portapapeles');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 text-ink"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar texto'}
                  </button>
                  {rewriteField === 'summary' && (
                    <button
                      type="button"
                      onClick={() => handleApplySummaryToProfile(rewriteResult.improved)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold"
                    >
                      Guardar como mi Resumen Profesional
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4 space-y-2">
                <Wand2 className="w-12 h-12 text-emerald-600/40" />
                <p className="text-sm font-bold text-ink">Tu versión mejorada aparecerá aquí</p>
                <p className="text-xs text-ink-secondary max-w-sm">
                  Transformamos descripciones simples en logros orientados a resultados bajo la metodología STAR buscada por reclutadores.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: COACH CONVERSACIONAL IA
          ==================================================================== */}
      {activeTab === 'chat' && (
        <div
          className="rounded-3xl border shadow-xs flex flex-col h-[620px] overflow-hidden animate-fade-in-up"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-ink">Coach de Carrera IA · Universidad Popular del Cesar</h3>
                <p className="text-[11px] text-ink-secondary">Contextualizado en tiempo real con tu expediente profesional</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-none'
                      : 'bg-muted text-ink border rounded-bl-none'
                  }`}
                  style={m.role === 'assistant' ? { borderColor: 'var(--border-color)' } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sendingChat && (
              <div className="text-xs text-ink-secondary italic animate-pulse">
                El Copiloto IA está redactando una recomendación personalizada...
              </div>
            )}
          </div>

          {/* Sugerencias rápidas */}
          <div className="px-4 py-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendChat(sug)}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="p-4 border-t flex items-center gap-2"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pregúntame sobre tu CV, negociación salarial, entrevistas o habilidades..."
              className="input flex-1 text-xs"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

