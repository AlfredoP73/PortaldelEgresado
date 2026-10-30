import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, {
  getAdminSurveys,
  getSurveyTemplates,
  createAdminSurvey,
  updateAdminSurvey,
  toggleAdminSurvey,
  duplicateAdminSurvey,
  deleteAdminSurvey,
  getAdminSurveyResults,
} from '../../../api';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  Copy,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings2,
  Search,
  Calendar,
  GraduationCap,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import { exportToExcel } from '../../../utils/excelUtils';

export interface SurveyQuestion {
  id: string;
  section: string;
  question: string;
  type: 'radio' | 'checkbox' | 'scale' | 'select' | 'text' | 'textarea';
  required: boolean;
  options: string[];
}

export interface AdminSurveyItem {
  id: number;
  title: string;
  description?: string;
  moment_code: string;
  category: string;
  target_program_id?: number | null;
  target_program_name?: string | null;
  target_graduation_year?: number | null;
  is_mandatory: boolean;
  closes_at?: string | null;
  questions_json: SurveyQuestion[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  responses_count?: number;
}

interface ProgramItem {
  id: number;
  name: string;
}

const MOMENT_META: Record<string, { label: string; badge: string; desc: string }> = {
  M0: {
    label: 'Momento 0 (Al Graduarse)',
    badge: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
    desc: 'Expectativas y satisfacción al recibir el título (MEN / OLE)',
  },
  M1: {
    label: 'Momento 1 (1 Año)',
    badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    desc: 'Primera inserción laboral, salario IBC y pertinencia (OLE)',
  },
  M3: {
    label: 'Momento 3 (3 Años)',
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    desc: 'Consolidación profesional, movilidad y posgrados (IES / CNA)',
  },
  M5: {
    label: 'Momento 5 (5 Años)',
    badge: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    desc: 'Impacto social, liderazgo, emprendimiento y rediseño curricular',
  },
  TEMATICA: {
    label: 'Temática / Institucional',
    badge: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
    desc: 'Encuesta específica de programa, feria o educación continua',
  },
};

const QUESTION_TYPES: { value: SurveyQuestion['type']; label: string }[] = [
  { value: 'radio', label: 'Opción única (Radio)' },
  { value: 'checkbox', label: 'Selección múltiple (Casillas)' },
  { value: 'scale', label: 'Escala Likert 1 a 5 (Satisfacción / CNA)' },
  { value: 'select', label: 'Lista desplegable (Rangos SMLV / Tiempos)' },
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Respuesta abierta / Comentario largo' },
];

const DEFAULT_LIKERT = [
  '1 - Muy insatisfecho',
  '2 - Insatisfecho',
  '3 - Neutral',
  '4 - Satisfecho',
  '5 - Muy satisfecho',
];

const createEmptyQuestion = (idx: number): SurveyQuestion => ({
  id: `q_${Date.now()}_${idx}`,
  section: 'Módulo 1: Situación Laboral y Pertinencia',
  question: '',
  type: 'radio',
  required: true,
  options: ['Opción 1', 'Opción 2'],
});

export default function AdminSurveys() {
  const [surveys, setSurveys] = useState<AdminSurveyItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [momentFilter, setMomentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'BUILDER' | 'PREVIEW'>('BUILDER');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [momentCode, setMomentCode] = useState('M1');
  const [category, setCategory] = useState('Empleabilidad y Pertinencia (OLE/CNA)');
  const [targetProgramId, setTargetProgramId] = useState<string>('');
  const [targetGradYear, setTargetGradYear] = useState<string>('');
  const [closesAt, setClosesAt] = useState<string>('');
  const [isMandatory, setIsMandatory] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  // Results Modal State
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsData, setResultsData] = useState<any | null>(null);

  // Delete confirm
  const [deletingSurvey, setDeletingSurvey] = useState<AdminSurveyItem | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [survRes, tplRes, progRes] = await Promise.all([
        getAdminSurveys(),
        getSurveyTemplates().catch(() => ({ data: [] })),
        api.get('/programs').catch(() => ({ data: [] })),
      ]);
      setSurveys(survRes.data || []);
      setTemplates(tplRes.data || []);
      setPrograms(progRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error cargando encuestas de seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const openCreateBlank = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setMomentCode('M1');
    setCategory('Empleabilidad y Pertinencia (OLE/CNA)');
    setTargetProgramId('');
    setTargetGradYear('');
    setClosesAt('');
    setIsMandatory(false);
    setIsActive(true);
    setQuestions([createEmptyQuestion(1)]);
    setEditorTab('BUILDER');
    setEditorOpen(true);
  };

  const openFromTemplate = (tpl: any) => {
    setEditingId(null);
    setTitle(tpl.title || '');
    setDescription(tpl.description || '');
    setMomentCode(tpl.moment_code || 'M1');
    setCategory(tpl.category || 'Empleabilidad y Pertinencia (OLE/CNA)');
    setTargetProgramId('');
    setTargetGradYear('');
    setClosesAt('');
    setIsMandatory(Boolean(tpl.is_mandatory));
    setIsActive(true);
    setQuestions(
      (tpl.questions_json || []).map((q: any, i: number) => ({
        id: q.id || `q_${Date.now()}_${i}`,
        section: q.section || 'Seguimiento Institucional',
        question: q.question || '',
        type: q.type || 'radio',
        required: q.required !== false,
        options: Array.isArray(q.options) ? [...q.options] : [],
      }))
    );
    setEditorTab('BUILDER');
    setEditorOpen(true);
    toast.success(`Plantilla oficial ${tpl.moment_code} cargada. Puedes personalizarla antes de guardar.`);
  };

  const openEditSurvey = (s: AdminSurveyItem) => {
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description || '');
    setMomentCode(s.moment_code || 'M1');
    setCategory(s.category || 'Empleabilidad y Pertinencia (OLE/CNA)');
    setTargetProgramId(s.target_program_id ? String(s.target_program_id) : '');
    setTargetGradYear(s.target_graduation_year ? String(s.target_graduation_year) : '');
    setClosesAt(s.closes_at ? String(s.closes_at).slice(0, 10) : '');
    setIsMandatory(Boolean(s.is_mandatory));
    setIsActive(Boolean(s.is_active));
    setQuestions(
      (s.questions_json || []).map((q: any, i: number) => ({
        id: q.id || `q_${Date.now()}_${i}`,
        section: q.section || 'Seguimiento General',
        question: q.question || q.text || '',
        type: q.type || 'radio',
        required: q.required !== false,
        options: Array.isArray(q.options) ? [...q.options] : [],
      }))
    );
    setEditorTab('BUILDER');
    setEditorOpen(true);
  };

  const handleQuestionChange = (index: number, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const updated = { ...q, ...patch };
        if (patch.type === 'scale' && (!updated.options || updated.options.length < 3)) {
          updated.options = [...DEFAULT_LIKERT];
        } else if (
          patch.type &&
          ['radio', 'checkbox', 'select'].includes(patch.type) &&
          (!updated.options || updated.options.length === 0)
        ) {
          updated.options = ['Opción 1', 'Opción 2'];
        } else if (patch.type && ['text', 'textarea'].includes(patch.type)) {
          updated.options = [];
        }
        return updated;
      })
    );
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const copy = [...questions];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setQuestions(copy);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error('La encuesta debe tener al menos una pregunta.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Ingresa el título de la encuesta.');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`La pregunta #${i + 1} no tiene enunciado.`);
        return;
      }
      if (['radio', 'checkbox', 'select', 'scale'].includes(q.type)) {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          toast.error(`La pregunta #${i + 1} requiere al menos 2 opciones.`);
          return;
        }
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      moment_code: momentCode,
      category: category.trim() || 'Empleabilidad y Pertinencia (OLE/CNA)',
      target_program_id: targetProgramId ? Number(targetProgramId) : null,
      target_graduation_year: targetGradYear ? Number(targetGradYear) : null,
      closes_at: closesAt || null,
      is_mandatory: isMandatory,
      is_active: isActive,
      questions_json: questions.map((q) => ({
        ...q,
        question: q.question.trim(),
        section: q.section.trim() || 'Seguimiento Institucional',
        options: q.options.map((o) => o.trim()).filter(Boolean),
      })),
    };

    try {
      setSaving(true);
      if (editingId) {
        await updateAdminSurvey(editingId, payload);
        toast.success('Encuesta actualizada correctamente.');
      } else {
        await createAdminSurvey(payload);
        toast.success('Nueva encuesta de seguimiento creada.');
      }
      setEditorOpen(false);
      await loadInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar la encuesta');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: AdminSurveyItem) => {
    try {
      await toggleAdminSurvey(s.id);
      toast.success(s.is_active ? 'Encuesta pausada/desactivada' : 'Encuesta publicada para egresados');
      await loadInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el estado');
    }
  };

  const handleDuplicate = async (s: AdminSurveyItem) => {
    try {
      await duplicateAdminSurvey(s.id);
      toast.success('Encuesta duplicada como borrador inactivo.');
      await loadInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al duplicar encuesta');
    }
  };

  const confirmDelete = async () => {
    if (!deletingSurvey) return;
    try {
      await deleteAdminSurvey(deletingSurvey.id);
      toast.success('Encuesta eliminada definitivamente.');
      setDeletingSurvey(null);
      await loadInitialData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar encuesta');
    }
  };

  const openResults = async (s: AdminSurveyItem) => {
    setResultsOpen(true);
    setResultsLoading(true);
    setResultsData(null);
    try {
      const res = await getAdminSurveyResults(s.id);
      setResultsData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error cargando resultados');
      setResultsOpen(false);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleExportResultsExcel = () => {
    if (!resultsData || !resultsData.respondents) return;
    const surveyObj: AdminSurveyItem = resultsData.survey;
    const qs: SurveyQuestion[] = surveyObj.questions_json || [];

    if (resultsData.respondents.length === 0) {
      toast.error('Aún no hay respuestas registradas para exportar.');
      return;
    }

    const rows = resultsData.respondents.map((r: any) => {
      const base: Record<string, any> = {
        'ID Egresado': r.graduate_id,
        'Nombre Completo': r.graduate_name,
        'Programa Académico': r.program_name,
        'Año Graduación': r.graduation_year || 'N/A',
        'Fecha Respuesta': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A',
      };
      qs.forEach((q, idx) => {
        const val = r.answers?.[q.id];
        base[`P${idx + 1}: ${q.question}`] = Array.isArray(val) ? val.join('; ') : val ?? '';
      });
      return base;
    });

    exportToExcel(rows, `Resultados_${surveyObj.moment_code}_${surveyObj.id}`);
    toast.success('Reporte Excel generado para acreditación OLE/CNA.');
  };

  const filteredSurveys = surveys.filter((s) => {
    const matchText =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchMoment = momentFilter === 'ALL' || s.moment_code === momentFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && s.is_active) ||
      (statusFilter === 'INACTIVE' && !s.is_active);
    return matchText && matchMoment && matchStatus;
  });

  const totalResponses = surveys.reduce((acc, s) => acc + (s.responses_count || 0), 0);
  const activeCount = surveys.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div
        className="rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600">
              MEN · OLE · CNA Colombia
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-ink-tertiary)' }}>
              Universidad Popular del Cesar
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>
            Configuración de Encuestas de Seguimiento a Egresados
          </h2>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: 'var(--text-ink-secondary)' }}>
            Crea, personaliza, segmenta por programa o cohorte y analiza los instrumentos longitudinales del
            Observatorio Laboral para la Educación (Momentos M0, M1, M3 y M5) para autoevaluación y acreditación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openCreateBlank}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Encuesta Personalizada
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-tertiary)' }}>
            Total Instrumentos
          </p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
            {surveys.length}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
            Configurados en el sistema
          </p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-tertiary)' }}>
            Encuestas Activas
          </p>
          <p className="text-3xl font-black mt-1 text-emerald-600">{activeCount}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
            Visibles en portal web y app móvil
          </p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-tertiary)' }}>
            Respuestas Recolectadas
          </p>
          <p className="text-3xl font-black mt-1 text-sky-600">{totalResponses}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
            Exportables a Excel para CNA
          </p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-tertiary)' }}>
            Plantillas Oficiales OLE
          </p>
          <p className="text-3xl font-black mt-1 text-purple-600">{templates.length || 4}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
            Momentos M0, M1, M3 y M5 listos
          </p>
        </div>
      </div>

      {/* Quick Official Templates Bar */}
      {templates.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Crear rápido desde Plantilla Oficial Colombiana (MEN / OLE / CNA)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {templates.map((tpl) => {
              const meta = MOMENT_META[tpl.moment_code] || MOMENT_META.TEMATICA;
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => openFromTemplate(tpl)}
                  className="text-left p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                >
                  <div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <p className="text-xs font-bold mt-2 line-clamp-2" style={{ color: 'var(--text-main)' }}>
                      {tpl.title}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 mt-2 inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Usar plantilla ({tpl.questions_json?.length || 0} preguntas)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar encuesta por título, categoría o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={momentFilter}
            onChange={(e) => setMomentFilter(e.target.value)}
            className="input text-sm py-2"
          >
            <option value="ALL">Todos los Momentos OLE</option>
            <option value="M0">M0 · Recién Graduado</option>
            <option value="M1">M1 · 1 Año de Grado</option>
            <option value="M3">M3 · 3 Años de Grado</option>
            <option value="M5">M5 · 5 Años de Grado</option>
            <option value="TEMATICA">Temática / Otra</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input text-sm py-2"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Solo Activas</option>
            <option value="INACTIVE">Inactivas / Borradores</option>
          </select>
        </div>
      </div>

      {/* Survey Cards List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        >
          <ClipboardList className="w-12 h-12 mx-auto opacity-40 mb-3" style={{ color: 'var(--text-ink-tertiary)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
            No se encontraron encuestas con esos filtros
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
            Usa una plantilla oficial M0, M1, M3 o M5 arriba o crea una encuesta personalizada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSurveys.map((s) => {
            const meta = MOMENT_META[s.moment_code] || MOMENT_META.TEMATICA;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-6 flex flex-col justify-between transition-all shadow-sm hover:shadow-md"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                        {meta.label}
                      </span>
                      {s.is_mandatory && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                          Obligatoria
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(s)}
                      title="Clic para activar o pausar esta encuesta"
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                        s.is_active
                          ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                          : 'bg-slate-500/15 text-slate-500 hover:bg-slate-500/25'
                      }`}
                    >
                      {s.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {s.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>

                  <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-main)' }}>
                    {s.title}
                  </h3>
                  <p className="text-xs font-medium mt-1 text-emerald-600">{s.category}</p>
                  {s.description && (
                    <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--text-ink-secondary)' }}>
                      {s.description}
                    </p>
                  )}

                  {/* Targeting pills */}
                  <div className="flex flex-wrap gap-2 mt-4 text-xs" style={{ color: 'var(--text-ink-secondary)' }}>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                      {s.questions_json?.length || 0} preguntas
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                      {s.target_program_name || 'Todos los programas'}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      {s.target_graduation_year ? `Cohorte ${s.target_graduation_year}` : 'Todas las cohortes'}
                    </span>
                    {s.closes_at && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-muted)' }}
                      >
                        Cierra: {String(s.closes_at).slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-2"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <button
                    type="button"
                    onClick={() => openResults(s)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-sky-500/15 text-sky-600 hover:bg-sky-500/25 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Resultados ({s.responses_count || 0})
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditSurvey(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors"
                      style={{ color: 'var(--text-main)' }}
                      title="Configurar y editar preguntas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl hover:bg-amber-500/15 hover:text-amber-600 transition-colors"
                      style={{ color: 'var(--text-ink-secondary)' }}
                      title="Duplicar encuesta"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSurvey(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl text-rose-500 hover:bg-rose-500/15 transition-colors"
                      title="Eliminar encuesta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODAL CONSTRUCTOR / CONFIGURADOR DE ENCUESTA
      ===================================================================== */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className="w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                  {editingId ? 'Modificar y Configurar Encuesta de Seguimiento' : 'Crear Nueva Encuesta de Seguimiento'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-ink-secondary)' }}>
                  Configura segmentación, momento OLE y diseña los módulos de preguntas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl p-1" style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <button
                    type="button"
                    onClick={() => setEditorTab('BUILDER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      editorTab === 'BUILDER' ? 'bg-emerald-600 text-white shadow-sm' : ''
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Constructor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('PREVIEW')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      editorTab === 'PREVIEW' ? 'bg-emerald-600 text-white shadow-sm' : ''
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Vista Previa
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="p-2 rounded-xl hover:bg-black/10"
                  style={{ color: 'var(--text-ink-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSurvey} className="flex-1 overflow-y-auto p-6 space-y-6">
              {editorTab === 'BUILDER' ? (
                <>
                  {/* Configuración General */}
                  <div
                    className="rounded-2xl p-5 space-y-4"
                    style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
                  >
                    <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                      1. Parámetros Institucionales y Segmentación
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Título de la Encuesta *
                        </label>
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ej: Encuesta Momento 1 (M1) — Inserción Laboral Cohorte 2025"
                          className="input w-full text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Momento de Seguimiento (OLE / MEN) *
                        </label>
                        <select
                          value={momentCode}
                          onChange={(e) => setMomentCode(e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="M0">M0 · Al Graduarse (Recién Graduado)</option>
                          <option value="M1">M1 · 1 Año después del grado</option>
                          <option value="M3">M3 · 3 Años después del grado</option>
                          <option value="M5">M5 · 5 Años después del grado</option>
                          <option value="TEMATICA">Temática / Específica</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                        Descripción e Instrucciones para el Egresado
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explica el propósito institucional de la encuesta y la confidencialidad de los datos..."
                        className="input w-full text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Categoría CNA / Factor
                        </label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="input w-full text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Programa Objetivo
                        </label>
                        <select
                          value={targetProgramId}
                          onChange={(e) => setTargetProgramId(e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="">Todos los programas UPC</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Cohorte / Año de Grado
                        </label>
                        <input
                          type="number"
                          min={1990}
                          max={2035}
                          placeholder="Todas (ej. 2024)"
                          value={targetGradYear}
                          onChange={(e) => setTargetGradYear(e.target.value)}
                          className="input w-full text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                          Fecha Límite (Opcional)
                        </label>
                        <input
                          type="date"
                          value={closesAt}
                          onChange={(e) => setClosesAt(e.target.value)}
                          className="input w-full text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span style={{ color: 'var(--text-main)' }}>Publicar inmediatamente (Activa)</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={isMandatory}
                          onChange={(e) => setIsMandatory(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span style={{ color: 'var(--text-main)' }}>Marcar como Obligatoria (Destacada)</span>
                      </label>
                    </div>
                  </div>

                  {/* Constructor de Preguntas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                        2. Banco de Preguntas ({questions.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)])}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir Pregunta
                      </button>
                    </div>

                    {questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="rounded-2xl p-5 space-y-3 transition-all"
                        style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                            Pregunta #{idx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveQuestion(idx, -1)}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30"
                              title="Subir pregunta"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(idx, 1)}
                              disabled={idx === questions.length - 1}
                              className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30"
                              title="Bajar pregunta"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15"
                              title="Eliminar pregunta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-ink-secondary)' }}>
                              Módulo / Sección Temática
                            </label>
                            <input
                              type="text"
                              value={q.section}
                              onChange={(e) => handleQuestionChange(idx, { section: e.target.value })}
                              placeholder="Ej: Módulo 1: Situación Laboral"
                              className="input w-full text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-ink-secondary)' }}>
                              Tipo de Respuesta
                            </label>
                            <select
                              value={q.type}
                              onChange={(e) => handleQuestionChange(idx, { type: e.target.value as SurveyQuestion['type'] })}
                              className="input w-full text-xs"
                            >
                              {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-end pb-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => handleQuestionChange(idx, { required: e.target.checked })}
                                className="rounded text-emerald-600 w-4 h-4"
                              />
                              <span style={{ color: 'var(--text-main)' }}>Respuesta obligatoria</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-ink-secondary)' }}>
                            Enunciado de la Pregunta *
                          </label>
                          <input
                            type="text"
                            required
                            value={q.question}
                            onChange={(e) => handleQuestionChange(idx, { question: e.target.value })}
                            placeholder="Escribe la pregunta clara para el egresado..."
                            className="input w-full text-sm font-medium"
                          />
                        </div>

                        {/* Opciones dinámicas para radio / checkbox / select / scale */}
                        {['radio', 'checkbox', 'select', 'scale'].includes(q.type) && (
                          <div className="pt-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold" style={{ color: 'var(--text-ink-secondary)' }}>
                                Opciones de Respuesta ({q.options.length})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(idx, {
                                    options: [...q.options, `Opción ${q.options.length + 1}`],
                                  })
                                }
                                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Agregar opción
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const nextOpts = [...q.options];
                                      nextOpts[optIdx] = e.target.value;
                                      handleQuestionChange(idx, { options: nextOpts });
                                    }}
                                    className="input flex-1 text-xs py-1.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (q.options.length <= 2) {
                                        toast.error('Se requieren mínimo 2 opciones.');
                                        return;
                                      }
                                      handleQuestionChange(idx, {
                                        options: q.options.filter((_, j) => j !== optIdx),
                                      });
                                    }}
                                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => [...prev, createEmptyQuestion(prev.length + 1)])}
                      className="w-full py-3 rounded-2xl border-2 border-dashed text-xs font-bold text-emerald-600 hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <Plus className="w-4 h-4" /> Agregar otra pregunta al instrumento
                    </button>
                  </div>
                </>
              ) : (
                /* VISTA PREVIA DEL EGRESADO */
                <div className="max-w-2xl mx-auto space-y-6 py-2">
                  <div
                    className="rounded-2xl p-6"
                    style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
                  >
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                      {(MOMENT_META[momentCode] || MOMENT_META.TEMATICA).label}
                    </span>
                    <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>
                      {title || 'Título de la encuesta'}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
                      {description || 'Sin descripción adicional.'}
                    </p>
                  </div>

                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-2xl p-5 space-y-2.5"
                      style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">{q.section}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                        {idx + 1}. {q.question || '(Pregunta sin texto)'}{' '}
                        {q.required && <span className="text-rose-500">*</span>}
                      </p>

                      {(q.type === 'radio' || q.type === 'scale') && (
                        <div className="space-y-1.5 pt-1">
                          {q.options.map((o, i) => (
                            <label key={i} className="flex items-center gap-2 text-xs">
                              <input type="radio" disabled name={`prev_${q.id}`} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'checkbox' && (
                        <div className="space-y-1.5 pt-1">
                          {q.options.map((o, i) => (
                            <label key={i} className="flex items-center gap-2 text-xs">
                              <input type="checkbox" disabled />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'select' && (
                        <select disabled className="input w-full text-xs">
                          <option>Selecciona una opción...</option>
                          {q.options.map((o, i) => (
                            <option key={i}>{o}</option>
                          ))}
                        </select>
                      )}

                      {q.type === 'text' && (
                        <input type="text" disabled placeholder="Respuesta corta del egresado..." className="input w-full text-xs" />
                      )}

                      {q.type === 'textarea' && (
                        <textarea rows={3} disabled placeholder="Comentario abierto del egresado..." className="input w-full text-xs" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Footer */}
              <div
                className="pt-4 border-t flex items-center justify-end gap-3 sticky bottom-0 py-3"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-black/5"
                  style={{ color: 'var(--text-ink-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Guardar Cambios' : 'Crear y Publicar Encuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE RESULTADOS Y EXPORTACIÓN EXCEL (CNA / OLE)
      ===================================================================== */}
      {resultsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className="w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="px-6 py-4 border-b flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                  Consolidado Estadístico de Respuestas (OLE / CNA)
                </h3>
                {resultsData?.survey && (
                  <p className="text-xs" style={{ color: 'var(--text-ink-secondary)' }}>
                    {resultsData.survey.title} · Total respuestas: <strong>{resultsData.total_responses}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {resultsData && resultsData.total_responses > 0 && (
                  <button
                    type="button"
                    onClick={handleExportResultsExcel}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Download className="w-4 h-4" /> Exportar Excel (.xlsx)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setResultsOpen(false)}
                  className="p-2 rounded-xl hover:bg-black/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {resultsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : !resultsData || resultsData.total_responses === 0 ? (
                <div className="text-center py-14">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                  <p className="font-bold" style={{ color: 'var(--text-main)' }}>
                    Aún no se han recibido respuestas de egresados en esta encuesta.
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-ink-secondary)' }}>
                    Asegúrate de que esté en estado Activa para que aparezca en el portal del egresado y en la app móvil.
                  </p>
                </div>
              ) : (
                resultsData.question_stats.map((qs: any, idx: number) => (
                  <div
                    key={qs.id}
                    className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase text-emerald-600">{qs.section}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-ink-secondary)' }}>
                        {qs.answered_count} respuestas
                        {qs.average_scale !== null && ` · Promedio Likert: ${qs.average_scale} / 5.0`}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                      {idx + 1}. {qs.question}
                    </h4>

                    {qs.breakdown && qs.breakdown.length > 0 && !['text', 'textarea'].includes(qs.type) ? (
                      <div className="space-y-2 pt-1">
                        {qs.breakdown.map((b: any, bIdx: number) => (
                          <div key={bIdx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'var(--text-main)' }}>{b.option}</span>
                              <span className="font-bold">
                                {b.count} ({b.percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full transition-all"
                                style={{ width: `${Math.min(100, b.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-44 overflow-y-auto pt-1">
                        {qs.text_answers?.length === 0 ? (
                          <p className="text-xs italic" style={{ color: 'var(--text-ink-tertiary)' }}>
                            Sin comentarios registrados.
                          </p>
                        ) : (
                          qs.text_answers.map((ta: any, tIdx: number) => (
                            <div
                              key={tIdx}
                              className="p-3 rounded-xl text-xs"
                              style={{ backgroundColor: 'var(--bg-surface)' }}
                            >
                              <p className="font-bold text-emerald-600">{ta.graduate_name}</p>
                              <p className="mt-0.5" style={{ color: 'var(--text-main)' }}>
                                {ta.answer}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CONFIRMACIÓN DE ELIMINACIÓN
      ===================================================================== */}
      {deletingSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-3xl p-6 space-y-4 shadow-xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            <h3 className="text-lg font-bold text-rose-600">¿Eliminar encuesta de seguimiento?</h3>
            <p className="text-sm" style={{ color: 'var(--text-ink-secondary)' }}>
              Estás a punto de eliminar <strong>"{deletingSurvey.title}"</strong> junto con sus{' '}
              <strong>{deletingSurvey.responses_count || 0} respuestas</strong> asociadas. Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSurvey(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                Sí, eliminar encuesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

