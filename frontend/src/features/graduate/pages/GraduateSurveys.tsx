import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { graduatesApi } from '../../../api';
import { ClipboardList, CheckCircle2, Calendar, Sparkles } from 'lucide-react';

interface SurveyQuestion {
  id: string;
  section?: string;
  question: string;
  type: 'radio' | 'checkbox' | 'scale' | 'select' | 'text' | 'textarea';
  required?: boolean;
  options?: string[];
}

interface Survey {
  id: number;
  title: string;
  description: string;
  moment_code?: string;
  category?: string;
  is_mandatory?: boolean;
  closes_at?: string | null;
  questions_json: SurveyQuestion[];
}

const MOMENT_LABELS: Record<string, string> = {
  M0: 'Momento 0 · Al Graduarse',
  M1: 'Momento 1 · 1 Año de Grado',
  M3: 'Momento 3 · 3 Años de Grado',
  M5: 'Momento 5 · 5 Años de Grado',
  TEMATICA: 'Encuesta Institucional',
};

export default function GraduateSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completedSurveys, setCompletedSurveys] = useState<number[]>([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const res = await graduatesApi.get('/surveys');
      setSurveys(res.data || []);

      const completedIds: number[] = [];
      for (const survey of res.data || []) {
        try {
          const resp = await graduatesApi.get(`/surveys/${survey.id}/response`);
          if (resp.data) completedIds.push(survey.id);
        } catch {
          // Ignore
        }
      }
      setCompletedSurveys(completedIds);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleCheckboxToggle = (questionId: string, opt: string) => {
    setAnswers((prev) => {
      const current: string[] = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    for (const q of selectedSurvey.questions_json) {
      if (q.required !== false) {
        const val = answers[q.id];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Por favor responde: "${q.question}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      await graduatesApi.post(`/surveys/${selectedSurvey.id}/response`, answers);
      toast.success('Encuesta enviada exitosamente. ¡Gracias por tu aporte institucional!');
      setCompletedSurveys((prev) => [...prev, selectedSurvey.id]);
      setSelectedSurvey(null);
      setAnswers({});
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (selectedSurvey) {
    let lastSection = '';
    return (
      <div className="max-w-3xl mx-auto mt-4 pb-12 animate-fade-in-up">
        <button
          onClick={() => {
            setSelectedSurvey(null);
            setAnswers({});
          }}
          className="text-brand-600 hover:underline mb-4 font-semibold text-sm"
        >
          &larr; Volver a Encuestas de Seguimiento
        </button>

        <div className="card p-8">
          <div className="mb-6 border-b border-ink-100 pb-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                {MOMENT_LABELS[selectedSurvey.moment_code || 'M1'] || 'Seguimiento OLE / CNA'}
              </span>
              {selectedSurvey.is_mandatory && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600">
                  Obligatoria
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold font-heading text-ink">{selectedSurvey.title}</h2>
            <p className="text-ink-secondary mt-2 text-sm">{selectedSurvey.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedSurvey.questions_json.map((q: SurveyQuestion, idx: number) => {
              const showSection = q.section && q.section !== lastSection;
              if (q.section) lastSection = q.section;
              const isReq = q.required !== false;

              return (
                <div key={q.id} className="space-y-3">
                  {showSection && (
                    <div className="pt-3 pb-1 border-b border-ink-100">
                      <span className="text-xs font-black uppercase tracking-wider text-brand-600">{q.section}</span>
                    </div>
                  )}

                  <label className="block text-sm font-bold text-ink">
                    {idx + 1}. {q.question} {isReq && <span className="text-rose-500">*</span>}
                  </label>

                  {(q.type === 'radio' || q.type === 'scale') && (
                    <div className="space-y-2 mt-2">
                      {(q.options || []).map((opt: string) => {
                        const checked = answers[q.id] === opt;
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              checked
                                ? 'border-brand-600 bg-brand-50/60'
                                : 'border-ink-100 hover:border-brand-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={checked}
                              className="text-brand-600 focus:ring-brand-500"
                              onChange={(e) => handleOptionChange(q.id, e.target.value)}
                            />
                            <span className="text-sm font-medium text-ink">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="space-y-2 mt-2">
                      {(q.options || []).map((opt: string) => {
                        const current: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                        const checked = current.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              checked
                                ? 'border-brand-600 bg-brand-50/60'
                                : 'border-ink-100 hover:border-brand-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              className="rounded text-brand-600 focus:ring-brand-500"
                              onChange={() => handleCheckboxToggle(q.id, opt)}
                            />
                            <span className="text-sm font-medium text-ink">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'select' && (
                    <select
                      className="input w-full"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    >
                      <option value="">Selecciona una opción...</option>
                      {(q.options || []).map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {q.type === 'text' && (
                    <input
                      type="text"
                      className="input w-full"
                      value={answers[q.id] || ''}
                      placeholder="Escribe tu respuesta..."
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    />
                  )}

                  {q.type === 'textarea' && (
                    <textarea
                      rows={3}
                      className="input w-full"
                      value={answers[q.id] || ''}
                      placeholder="Escribe tus comentarios o recomendaciones..."
                      onChange={(e) => handleOptionChange(q.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5">
                {submitting ? 'Enviando respuestas...' : 'Finalizar y Enviar Encuesta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Observatorio Laboral para la Educación (OLE / CNA)
        </div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
          Encuestas de Seguimiento Institucional
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Diligencia los instrumentos correspondientes a tu momento de graduación para apoyar la acreditación de alta calidad de la UPC.
        </p>
      </div>

      {surveys.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-ink">No hay encuestas pendientes</h3>
          <p className="text-ink-secondary mt-2 max-w-md mx-auto">
            Vuelve más tarde para verificar si tienes nuevas encuestas asignadas por la institución.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => {
            const isCompleted = completedSurveys.includes(survey.id);
            return (
              <div
                key={survey.id}
                className={`card p-6 flex flex-col transition-all duration-300 ${
                  isCompleted ? 'bg-brand-50/50' : 'hover:-translate-y-1 group cursor-pointer'
                }`}
                onClick={() => {
                  if (!isCompleted) {
                    setAnswers({});
                    setSelectedSurvey(survey);
                  }
                }}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      {MOMENT_LABELS[survey.moment_code || 'M1'] || survey.moment_code}
                    </span>
                    {survey.is_mandatory && !isCompleted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600">
                        Obligatoria
                      </span>
                    )}
                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0" />}
                  </div>

                  <h3
                    className={`text-lg font-bold line-clamp-2 ${
                      isCompleted ? 'text-ink-secondary' : 'text-ink group-hover:text-brand-600'
                    } transition-colors`}
                  >
                    {survey.title}
                  </h3>
                  <p className="text-sm text-ink-tertiary line-clamp-3 mt-1.5">{survey.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-ink-100 flex items-center justify-between">
                  <span className="text-xs text-ink-tertiary flex items-center gap-1">
                    {survey.closes_at ? (
                      <>
                        <Calendar className="w-3.5 h-3.5" /> Hasta {String(survey.closes_at).slice(0, 10)}
                      </>
                    ) : (
                      `${survey.questions_json?.length || 0} preguntas`
                    )}
                  </span>

                  {isCompleted ? (
                    <span className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Completada
                    </span>
                  ) : (
                    <button className="text-sm font-semibold text-brand-600 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white px-4 py-2 rounded-lg transition-colors">
                      Responder
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
