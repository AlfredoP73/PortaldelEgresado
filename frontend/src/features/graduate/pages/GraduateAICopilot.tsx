import { useEffect, useState } from 'react';
import {
  Sparkles, Target, Wand2, MessageSquare, CheckCircle2,
  Plus, RefreshCw, Send, Copy, Check, Calendar, Award,
  ArrowRight, AlertTriangle, Zap, ShieldCheck, Layers, RotateCcw,
  Trash2, History, Smartphone, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { graduatesApi } from '../../../api/index';
import {
  analyzeProfileWithAi,
  rewriteWithAi,
  chatWithCoach,
  getCoachSessions,
  createCoachSession,
  getCoachSession,
  deleteCoachSession,
  type CoachAnalysis,
  type CoachRewrite,
  type CoachChatSession,
} from '../../../api/aiServices';

export default function GraduateAICopilot() {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'rewriter' | 'chat'>('diagnosis');

  // Tab 1: Diagnóstico 360°
  const [targetRole, setTargetRole] = useState('');
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [applyingSummary, setApplyingSummary] = useState(false);
  const [addingSkillName, setAddingSkillName] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedHeadline, setCopiedHeadline] = useState(false);

  // Tab 2: Reescritor STAR
  const [rewriteField, setRewriteField] = useState<'summary' | 'experience' | 'project' | 'cover_letter' | 'headline'>('experience');
  const [inputText, setInputText] = useState('');
  const [ctxPosition, setCtxPosition] = useState('');
  const [ctxCompany, setCtxCompany] = useState('');
  const [rewriteResult, setRewriteResult] = useState<CoachRewrite | null>(null);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Tab 3: Chat Coach (con Historial Persistente Web <-> Móvil y Acceso Seguro al Sistema)
  const initialMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'assistant',
      content:
        '¡Hola! Soy tu **Copiloto IA de Empleabilidad UPC**. Tengo acceso en tiempo real a tu expediente, a tus postulaciones y al **catálogo de vacantes activas del portal** (bajo estricta protección de datos personales de terceros). ¿Qué aspecto de tu carrera o búsqueda laboral impulsamos hoy?',
    },
  ];
  const [sessions, setSessions] = useState<CoachChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    '¿Qué vacantes activas hay en el portal para mi perfil?',
    '¿Cuál es el estado actual de mis postulaciones?',
    '¿Qué habilidades me recomiendas agregar según mi carrera?',
    'Ayúdame a redactar un logro con metodología STAR',
  ]);

  const loadChatSessions = async (selectId?: number) => {
    try {
      setLoadingSessions(true);
      const res = await getCoachSessions();
      const list = Array.isArray(res.data) ? res.data : [];
      setSessions(list);
      const targetId = selectId ?? activeSessionId ?? (list[0]?.id || null);
      if (targetId) {
        setActiveSessionId(targetId);
        const detail = await getCoachSession(targetId);
        if (detail.data?.messages?.length) {
          setMessages(
            detail.data.messages.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            }))
          );
        }
      }
    } catch {
      // Fallback local si el servicio está reiniciando
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectSession = async (sessionId: number) => {
    try {
      setActiveSessionId(sessionId);
      setShowSidebarMobile(false);
      const detail = await getCoachSession(sessionId);
      if (detail.data?.messages?.length) {
        setMessages(
          detail.data.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          }))
        );
      } else {
        setMessages(initialMessages);
      }
    } catch {
      toast.error('No se pudo cargar la conversación');
    }
  };

  const handleNewChatSession = async () => {
    try {
      setLoadingSessions(true);
      const res = await createCoachSession('Nueva conversación');
      const created = res.data;
      setActiveSessionId(created.id);
      setMessages(
        created.messages?.length
          ? created.messages.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            }))
          : initialMessages
      );
      setSuggestions([
        '¿Qué vacantes activas hay en el portal para mi perfil?',
        '¿Cuál es el estado actual de mis postulaciones?',
        '¿Qué habilidades me recomiendas agregar según mi carrera?',
        'Ayúdame a redactar un logro con metodología STAR',
      ]);
      const listRes = await getCoachSessions();
      if (Array.isArray(listRes.data)) setSessions(listRes.data);
      setShowSidebarMobile(false);
      toast.success('Nueva conversación iniciada');
    } catch {
      setMessages(initialMessages);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await deleteCoachSession(sessionId);
      const remaining = res.data?.sessions || [];
      setSessions(remaining);
      const active = res.data?.active_session;
      if (active) {
        setActiveSessionId(active.id);
        setMessages(
          active.messages?.length
            ? active.messages.map((m) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              }))
            : initialMessages
        );
      }
      toast.success('Conversación eliminada');
    } catch {
      toast.error('No se pudo eliminar la conversación');
    }
  };

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
    loadChatSessions();
  }, []);

  const handleApplySummaryToProfile = async (newSummary: string) => {
    try {
      setApplyingSummary(true);
      const profRes = await graduatesApi.get('/profile');
      const current = profRes.data;
      await graduatesApi.post('/profile', {
        first_name: current.first_name,
        last_name: current.last_name,
        phone: current.phone || '',
        profile_summary: newSummary,
        availability_status: current.availability_status,
        preferred_modality: current.preferred_modality,
        expected_salary: current.expected_salary,
        Current_Country: current.Current_Country,
        Current_Department: current.Current_Department,
        Current_City: current.Current_City,
        work_country: current.work_country,
        work_department: current.work_department,
        work_city: current.work_city,
      });
      toast.success('¡Resumen profesional actualizado en tu perfil!');
      runAnalysis(targetRole || undefined);
    } catch (err) {
      toast.error('No se pudo actualizar el resumen en tu perfil');
    } finally {
      setApplyingSummary(false);
    }
  };

  const handleQuickAddSkill = async (skillName: string) => {
    try {
      setAddingSkillName(skillName);
      await graduatesApi.post('/profile/skills/quick-add', {
        skill_name: skillName,
        level: 'Intermedio',
      });
      toast.success(`Habilidad "${skillName}" agregada a tu perfil`);
      runAnalysis(targetRole || undefined);
    } catch (err) {
      toast.error('No se pudo agregar la habilidad');
    } finally {
      setAddingSkillName(null);
    }
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      toast.error('Escribe primero el texto base que deseas mejorar');
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
      toast.error(err?.response?.data?.detail || 'Error al reescribir el texto');
    } finally {
      setLoadingRewrite(false);
    }
  };

  const handleSendChat = async (customPrompt?: string) => {
    const promptText = (customPrompt ?? chatInput).trim();
    if (!promptText || sendingChat) return;

    const updated: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'user', content: promptText },
    ];
    setMessages(updated);
    setChatInput('');

    try {
      setSendingChat(true);
      const res = await chatWithCoach(updated, activeSessionId);
      if (res.data.session_id && res.data.session_id !== activeSessionId) {
        setActiveSessionId(res.data.session_id);
      }
      if (res.data.messages?.length) {
        setMessages(
          res.data.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          }))
        );
      } else {
        setMessages([...updated, { role: 'assistant', content: res.data.reply }]);
      }
      // Actualizar lista lateral de conversaciones sincronizadas
      getCoachSessions()
        .then((listRes) => {
          if (Array.isArray(listRes.data)) setSessions(listRes.data);
        })
        .catch(() => {});

      const askedSet = new Set(
        updated.filter((m) => m.role === 'user').map((m) => m.content.trim().toLowerCase())
      );
      if (res.data.suggestions?.length) {
        const fresh = res.data.suggestions.filter((s) => !askedSet.has(s.trim().toLowerCase()));
        setSuggestions(
          fresh.length > 0
            ? fresh
            : [
                '¿Qué vacantes activas hay en el portal para mi perfil?',
                '¿Cuál es el estado actual de mis postulaciones?',
                '¿Qué proyectos puedo publicar en mi portafolio para destacar?',
              ].filter((s) => !askedSet.has(s.toLowerCase()))
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al consultar al Copiloto IA');
    } finally {
      setSendingChat(false);
    }
  };

  const statusMeta = (st: string, score: number) => {
    if (st === 'excellent' || score >= 80) {
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        bar: 'linear-gradient(90deg, #059669, #10b981)',
        label: 'Óptimo',
      };
    }
    if (st === 'good' || score >= 60) {
      return {
        badge: 'bg-sky-50 text-sky-800 border-sky-200',
        bar: 'linear-gradient(90deg, #0284c7, #38bdf8)',
        label: 'Competitivo',
      };
    }
    if (st === 'improve' || score >= 40) {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        bar: 'linear-gradient(90deg, #d97706, #fbbf24)',
        label: 'Por Mejorar',
      };
    }
    return {
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      bar: 'linear-gradient(90deg, #e11d48, #fb7185)',
      label: 'Prioritario',
    };
  };

  // Formateador avanzado de Markdown (Tablas reales, Encabezados, Código, Listas, Negrita/Cursiva) para el Chat IA
  const renderRichText = (raw: string, isUser: boolean) => {
    const formatInline = (line: string) => {
      // Tokenize **bold**, `code`, and *italic*
      const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
      return tokens.map((tok, idx) => {
        if (!tok) return null;
        if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
          return (
            <strong
              key={idx}
              className={
                isUser
                  ? 'font-black text-white'
                  : 'font-extrabold text-emerald-700 dark:text-emerald-300'
              }
            >
              {tok.slice(2, -2)}
            </strong>
          );
        }
        if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
          return (
            <code
              key={idx}
              className={
                isUser
                  ? 'px-1.5 py-0.5 rounded bg-white/20 text-white font-mono text-[11px]'
                  : 'px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-mono text-[11px] font-bold'
              }
            >
              {tok.slice(1, -1)}
            </code>
          );
        }
        if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
          return (
            <em key={idx} className="italic font-semibold opacity-95">
              {tok.slice(1, -1)}
            </em>
          );
        }
        return <span key={idx}>{tok}</span>;
      });
    };

    const parseTableCells = (rowLine: string): string[] => {
      const cleaned = rowLine.trim().replace(/^\|/, '').replace(/\|$/, '');
      return cleaned.split('|').map((c) => c.trim());
    };

    const isSeparatorRow = (rowLine: string): boolean => {
      const trimmed = rowLine.trim();
      if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
      const cells = parseTableCells(trimmed);
      return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
    };

    const lines = raw.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Blank line
      if (!trimmed) {
        elements.push(<div key={`sp-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // 2. Horizontal rule (---, ***, ___)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        elements.push(
          <hr
            key={`hr-${i}`}
            className="my-2.5 border-t"
            style={{ borderColor: 'var(--border-color)' }}
          />
        );
        i++;
        continue;
      }

      // 3. Fenced Code Block (```lang ... ```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim() || 'código';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```
        elements.push(
          <div
            key={`code-${i}`}
            className="my-2.5 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-xs"
          >
            <div className="px-3 py-1 bg-slate-800 border-b border-slate-700 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              {lang}
            </div>
            <pre className="p-3 text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 4. Markdown Table (| col1 | col2 | followed by |---|---|)
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        isSeparatorRow(lines[i + 1])
      ) {
        const headers = parseTableCells(trimmed);
        i += 2; // skip header and separator row
        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].trim().includes('|')) {
          if (!isSeparatorRow(lines[i])) {
            bodyRows.push(parseTableCells(lines[i]));
          }
          i++;
        }

        elements.push(
          <div
            key={`tbl-${i}`}
            className="my-3 overflow-x-auto rounded-2xl border shadow-2xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    background: 'linear-gradient(90deg, rgba(8,116,67,0.12), rgba(16,185,129,0.06))',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3.5 py-2.5 font-black uppercase tracking-wider text-[11px] text-emerald-800 dark:text-emerald-300"
                    >
                      {formatInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="transition-colors hover:bg-emerald-500/5"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {headers.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3.5 py-2.5 align-top leading-relaxed text-ink"
                      >
                        {formatInline(row[cIdx] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // 5. Headings (#, ##, ###, ####)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        elements.push(
          <div
            key={`hd-${i}`}
            className={`pt-2 pb-1 flex items-center gap-2 ${
              level <= 2
                ? 'text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-300 border-b pb-1.5'
                : 'text-xs sm:text-sm font-black text-ink'
            }`}
            style={level <= 2 ? { borderColor: 'var(--border-color)' } : undefined}
          >
            <span className="w-1.5 h-4 rounded-full bg-emerald-600 shrink-0" />
            <span>{formatInline(headingText)}</span>
          </div>
        );
        i++;
        continue;
      }

      // 6. Blockquote (> ...)
      if (trimmed.startsWith('> ')) {
        elements.push(
          <div
            key={`bq-${i}`}
            className="my-1.5 pl-3 py-1.5 border-l-3 border-emerald-600 bg-emerald-500/5 rounded-r-xl text-xs italic text-ink-secondary"
          >
            {formatInline(trimmed.slice(2))}
          </div>
        );
        i++;
        continue;
      }

      // 7. Bullet list (- , * , • )
      if (
        trimmed.startsWith('- ') ||
        trimmed.startsWith('• ') ||
        (trimmed.startsWith('* ') && !trimmed.startsWith('**'))
      ) {
        elements.push(
          <div key={`ul-${i}`} className="flex items-start gap-2 pl-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-black mt-0.5">•</span>
            <span className="flex-1">{formatInline(trimmed.slice(2))}</span>
          </div>
        );
        i++;
        continue;
      }

      // 8. Numbered list (1. , 2. )
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`ol-${i}`} className="flex items-start gap-2 pl-1">
            <span className="w-5 h-5 rounded-full bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
              {numMatch[1]}
            </span>
            <span className="flex-1">{formatInline(numMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // 9. Standard paragraph
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {formatInline(trimmed)}
        </p>
      );
      i++;
    }

    return <div className="space-y-1.5">{elements}</div>;
  };

  const scoreValue = analysis?.overall_score ?? 0;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, scoreValue)) / 100) * circumference;

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto">
      {/* ====================================================================
          HERO BANNER EJECUTIVO
          ==================================================================== */}
      <div
        className="p-6 sm:p-7 rounded-3xl border shadow-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #065f46 52%, #087443 100%)',
          borderColor: 'rgba(16,185,129,0.45)',
        }}
      >
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: '#ecfdf5',
                }}
              >
                COPILOTO IA DE EMPLEABILIDAD · GROQ LLM
              </span>
              {analysis && (
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: 'rgba(16,185,129,0.25)',
                    borderColor: 'rgba(110,231,183,0.45)',
                    color: '#d1fae5',
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  {analysis.source === 'groq' ? `Conectado a Groq (${analysis.model})` : 'Motor Experto UPC Activo'}
                </span>
              )}
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3"
              style={{ color: '#ffffff' }}
            >
              <span className="p-2 rounded-2xl bg-white/15 border border-white/20 shrink-0">
                <Sparkles className="w-7 h-7 text-emerald-200" />
              </span>
              <span>Potencia tu Perfil Profesional en Todos los Aspectos</span>
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'rgba(236,253,245,0.9)' }}>
              Auditoría integral 360° de tus 7 dimensiones profesionales, reescritor inteligente con metodología STAR y mentor conversacional en tiempo real.
            </p>
          </div>

          {/* Selector de Pestañas */}
          <div
            className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl border self-start lg:self-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderColor: 'rgba(255,255,255,0.18)' }}
          >
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'diagnosis' ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-50 hover:bg-white/10'
              }`}
            >
              <Target className="w-4 h-4" /> Diagnóstico 360°
            </button>
            <button
              onClick={() => setActiveTab('rewriter')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'rewriter' ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-50 hover:bg-white/10'
              }`}
            >
              <Wand2 className="w-4 h-4" /> Reescritor STAR
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'chat' ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-50 hover:bg-white/10'
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
            className="p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink-secondary mb-1.5">
                ¿A qué cargo o rol profesional aspiras? (Opcional — calibra el diagnóstico IA y las palabras clave ATS)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runAnalysis(targetRole || undefined);
                }}
                placeholder="Ej. Desarrollador Backend Cloud, Analista Financiero Senior, Ingeniero de Datos, Coordinador Clínico..."
                className="input w-full text-xs"
              />
            </div>
            <button
              onClick={() => runAnalysis(targetRole || undefined)}
              disabled={loadingAnalysis}
              className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shrink-0 sm:mt-5 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAnalysis ? 'animate-spin' : ''}`} />
              {loadingAnalysis ? 'Auditando perfil...' : 'Evaluar con IA'}
            </button>
          </div>

          {loadingAnalysis ? (
            <div
              className="p-16 rounded-3xl border text-center space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-ink">Auditando las 7 dimensiones de tu perfil profesional...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Score Global + Resumen Ejecutivo y Victorias Rápidas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda (4 cols): Medidor Radial de Competitividad */}
                <div
                  className="lg:col-span-4 p-6 rounded-3xl border shadow-xs flex flex-col justify-between space-y-5"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Índice de Competitividad
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Nivel {analysis.level}
                      </span>
                    </div>

                    {/* Medidor Radial SVG + Diagnóstico Principal */}
                    <div className="flex items-center gap-5 py-2">
                      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                          <circle
                            cx="56"
                            cy="56"
                            r={radius}
                            fill="transparent"
                            stroke="var(--border-color)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r={radius}
                            fill="transparent"
                            stroke={scoreValue >= 75 ? '#059669' : scoreValue >= 50 ? '#0284c7' : '#10b981'}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-ink leading-none">{analysis.overall_score}</span>
                          <span className="text-[10px] font-extrabold text-ink-tertiary mt-0.5">/ 100 PTS</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-extrabold text-ink leading-snug">{analysis.headline}</p>
                        <p className="text-[11px] text-ink-secondary leading-relaxed">
                          Ponderación basada en resumen, experiencia, habilidades, portafolio, certificaciones y visibilidad ATS.
                        </p>
                      </div>
                    </div>

                    {/* Caja de Titular Profesional Sugerido */}
                    <div
                      className="p-3.5 rounded-2xl border space-y-1.5"
                      style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Titular Profesional Sugerido
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(analysis.suggested_headline);
                            setCopiedHeadline(true);
                            toast.success('Titular copiado al portapapeles');
                            setTimeout(() => setCopiedHeadline(false), 2000);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          {copiedHeadline ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedHeadline ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-xs font-extrabold text-ink leading-snug">
                        "{analysis.suggested_headline}"
                      </p>
                    </div>
                  </div>

                  {/* Palabras Clave ATS */}
                  <div className="pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary block">
                      Palabras Clave ATS Detectadas / Recomendadas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha (8 cols): Resumen Ejecutivo Optimizado + 3 Victorias Rápidas */}
                <div
                  className="lg:col-span-8 p-6 rounded-3xl border shadow-xs flex flex-col justify-between space-y-5 relative overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  {/* Barra superior decorativa esmeralda */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ background: 'linear-gradient(90deg, #059669, #10b981, #0ea5e9)' }}
                  />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-ink">
                            Resumen Ejecutivo Optimizado por IA para tu Perfil
                          </h3>
                          <p className="text-[11px] text-ink-secondary">
                            Redactado en primera persona a partir de tu expediente real de la Universidad Popular del Cesar
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Optimizado para Filtros ATS
                      </span>
                    </div>

                    {/* Bloque del Resumen (Contraste limpio y borde lateral esmeralda) */}
                    <div
                      className="p-4 sm:p-5 rounded-2xl border-l-4 border border-emerald-200/80 relative"
                      style={{
                        backgroundColor: 'var(--bg-muted)',
                        borderLeftColor: '#059669',
                      }}
                    >
                      <p className="text-sm text-ink leading-relaxed font-medium italic">
                        "{analysis.improved_summary}"
                      </p>
                    </div>
                  </div>

                  {/* 3 Tarjetas de Victorias Rápidas con alto contraste */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        3 Victorias Rápidas para Subir tu Puntaje Hoy
                      </span>
                      <span className="text-[11px] font-semibold text-ink-tertiary">
                        Priorizadas por impacto en el algoritmo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {analysis.quick_wins.map((qw, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-all hover:shadow-sm"
                          style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                                  {idx + 1}
                                </span>
                                Victoria #{idx + 1}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  qw.impact === 'high'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-sky-50 text-sky-800 border-sky-200'
                                }`}
                              >
                                Impacto {qw.impact === 'high' ? 'Alto' : 'Medio'}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-ink leading-snug">{qw.title}</p>
                            <p className="text-[11px] text-ink-secondary leading-relaxed">{qw.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botones de Acción del Resumen */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis.improved_summary);
                        setCopiedSummary(true);
                        toast.success('Resumen copiado al portapapeles');
                        setTimeout(() => setCopiedSummary(false), 2000);
                      }}
                      className="px-3.5 py-2 rounded-xl border text-xs font-bold text-ink-secondary hover:text-ink flex items-center gap-1.5 transition-colors"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copiedSummary ? 'Resumen copiado' : 'Copiar resumen'}
                    </button>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText(analysis.improved_summary);
                          setRewriteField('summary');
                          setActiveTab('rewriter');
                        }}
                        className="px-4 py-2.5 rounded-xl border text-xs font-extrabold text-ink hover:bg-muted transition-colors flex items-center gap-1.5"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
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
              </div>

              {/* Desglose de las 7 Dimensiones del Perfil */}
              <div
                className="p-6 rounded-3xl border shadow-xs space-y-4"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-black text-ink">
                      Desglose de las 7 Dimensiones de tu Perfil Profesional
                    </h3>
                  </div>
                  <span className="text-xs text-ink-secondary">
                    Diagnóstico individual y acción recomendada por dimensión
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.sections.map((sec) => {
                    const meta = statusMeta(sec.status, sec.score);
                    return (
                      <div
                        key={sec.key}
                        className="p-4 rounded-2xl border space-y-3 flex flex-col justify-between transition-all hover:shadow-xs"
                        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-ink">{sec.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                                {meta.label}
                              </span>
                              <span className="text-xs font-black text-ink">{sec.score}/100</span>
                            </div>
                          </div>

                          <div
                            className="h-2.5 rounded-full overflow-hidden border"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${sec.score}%`, background: meta.bar }}
                            />
                          </div>

                          {sec.findings.map((f, i) => (
                            <p key={i} className="text-xs text-ink-secondary leading-relaxed">
                              {f}
                            </p>
                          ))}
                        </div>

                        {sec.actions.length > 0 && (
                          <div
                            className="pt-2.5 border-t text-[11px] font-bold text-emerald-700 flex items-start gap-1.5"
                            style={{ borderColor: 'var(--border-color)' }}
                          >
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{sec.actions[0]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Habilidades recomendadas para añadir en 1 clic + Plan de 30 Días */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                  className="p-6 rounded-3xl border shadow-xs space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-ink flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-600" />
                      Habilidades Sugeridas para Subir tu Matchmaking
                    </h3>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Agregar en 1 clic
                    </span>
                  </div>
                  <div className="space-y-3">
                    {analysis.skills_to_add.map((sk, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
                        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                      >
                        <div>
                          <p className="text-xs font-extrabold text-ink">{sk.name}</p>
                          <p className="text-[11px] text-ink-secondary mt-0.5">{sk.reason}</p>
                        </div>
                        <button
                          type="button"
                          disabled={addingSkillName === sk.name}
                          onClick={() => handleQuickAddSkill(sk.name)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="p-6 rounded-3xl border shadow-xs space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <h3 className="text-base font-black text-ink flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Plan de Acción de Empleabilidad a 30 Días
                  </h3>
                  <div className="space-y-3">
                    {analysis.plan_30_days.map((wk) => (
                      <div
                        key={wk.week}
                        className="p-3.5 rounded-2xl border space-y-1.5"
                        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-700 text-white">
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
            className="p-6 rounded-3xl border shadow-xs space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-base font-black text-ink flex items-center gap-2">
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
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
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
            className="p-6 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            {rewriteResult ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-ink flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Versión Mejorada de Alto Impacto
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rewriteResult.source === 'groq' ? 'IA · Groq' : 'Motor STAR UPC'}
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-2xl border-l-4 border border-emerald-200 text-sm text-ink leading-relaxed whitespace-pre-line"
                    style={{ backgroundColor: 'var(--bg-muted)', borderLeftColor: '#059669' }}
                  >
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
          TAB 3: COACH CONVERSACIONAL IA (CON HISTORIAL SINCRONIZADO WEB & MÓVIL)
          ==================================================================== */}
      {activeTab === 'chat' && (
        <div
          className="rounded-3xl border shadow-xs flex h-[680px] overflow-hidden animate-fade-in-up relative"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          {/* BARRA LATERAL DE CONVERSACIONES GUARDADAS */}
          <aside
            className={`${
              showSidebarMobile ? 'flex absolute inset-y-0 left-0 z-30 w-80 shadow-2xl' : 'hidden md:flex w-72 lg:w-80'
            } flex-col border-r shrink-0`}
            style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
          >
            <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-ink">
                    Mis Conversaciones ({sessions.length})
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  <Smartphone className="w-3 h-3" /> Web & Móvil
                </span>
              </div>

              <button
                type="button"
                onClick={handleNewChatSession}
                disabled={loadingSessions}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" /> Nueva Conversación
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {sessions.map((sess) => {
                const isSelected = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group rounded-2xl p-3 cursor-pointer border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        : 'hover:border-emerald-500/40 text-ink'
                    }`}
                    style={
                      !isSelected
                        ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }
                        : undefined
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-emerald-200' : 'text-emerald-600'
                          }`}
                        />
                        <p className="text-xs font-extrabold truncate">{sess.title}</p>
                      </div>
                      {sess.last_message_preview && (
                        <p
                          className={`text-[11px] truncate mt-1 ${
                            isSelected ? 'text-emerald-100/90' : 'text-ink-secondary'
                          }`}
                        >
                          {sess.last_message_preview}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {sess.message_count || 1} msj
                        </span>
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-emerald-100/80' : 'text-ink-tertiary'
                          }`}
                        >
                          {sess.updated_at ? new Date(sess.updated_at).toLocaleDateString('es-CO') : 'Hoy'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Eliminar conversación"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className={`p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity ${
                        isSelected
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-rose-500/10 text-ink-tertiary hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              className="p-3 border-t text-[10px] text-ink-secondary flex items-start gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Acceso Seguro UPC:</strong> Consulta vacantes y tus postulaciones en vivo. Datos privados de terceros protegidos (Ley 1581).
              </span>
            </div>
          </aside>

          {/* PANEL PRINCIPAL DE CONVERSACIÓN */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowSidebarMobile(!showSidebarMobile)}
                  className="md:hidden p-2 rounded-xl border text-ink-secondary hover:text-ink"
                  style={{ borderColor: 'var(--border-color)' }}
                  title="Ver historial de chats"
                >
                  <History className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-ink truncate">
                      {sessions.find((s) => s.id === activeSessionId)?.title || 'Coach de Carrera IA · UPC'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                      Conectado a Vacantes y Postulaciones en Vivo
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary truncate">
                    Historial guardado y sincronizado entre tu Portal Web y App Móvil · Protección Habeas Data activa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadChatSessions(activeSessionId || undefined)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold text-ink-secondary hover:text-ink flex items-center gap-1.5"
                  style={{ borderColor: 'var(--border-color)' }}
                  title="Sincronizar mensajes con App Móvil"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sincronizar</span>
                </button>
                <button
                  type="button"
                  onClick={handleNewChatSession}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-700 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo chat
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`${
                      m.role === 'user' ? 'max-w-2xl' : 'max-w-4xl w-full'
                    } rounded-2xl px-4 sm:px-5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      m.role === 'user'
                        ? 'bg-emerald-700 text-white rounded-br-none'
                        : 'text-ink border rounded-bl-none'
                    }`}
                    style={
                      m.role === 'assistant'
                        ? { backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }
                        : undefined
                    }
                  >
                    {renderRichText(m.content, m.role === 'user')}
                  </div>
                </div>
              ))}
              {sendingChat && (
                <div className="text-xs text-ink-secondary italic animate-pulse pl-2">
                  El Copiloto IA está consultando el sistema y redactando una respuesta personalizada...
                </div>
              )}
            </div>

            {/* Sugerencias rápidas dinámicas (no repetitivas) */}
            <div
              className="px-4 py-2.5 border-t flex items-center gap-2 overflow-x-auto"
              style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-ink-tertiary shrink-0">
                Preguntas sugeridas:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendChat(sug)}
                    className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-200 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
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
                placeholder="Pregúntame qué vacantes hay en el portal, el estado de tus postulaciones, cursos, salarios o método STAR..."
                className="input flex-1 text-xs"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-4 h-4" /> Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
