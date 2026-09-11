import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import api from '../../../api';
import { X, ExternalLink, GraduationCap, Briefcase, FileText, Star } from 'lucide-react';
import Modal from '../../../components/Modal';

const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL !== undefined ? import.meta.env.VITE_GRADUATES_URL : 'http://localhost:8003';

interface WorkExperience {
  id: number;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
  certificate_url?: string;
}

interface AcademicHistory {
  id: number;
  institution: string;
  degree: string;
  start_date: string;
  end_date?: string;
  diploma_url?: string;
}

interface Graduate {
  user_id: number;
  first_name: string;
  last_name: string;
  program_id: number;
  graduation_year: number;
  phone?: string;
  email?: string;
  cv_url?: string;
  profile_summary?: string;
  experiences?: WorkExperience[];
  academic_histories?: AcademicHistory[];
}

interface CandidateDetailsModalProps {
  applicationId: number;
  onClose: () => void;
  application?: any;
  onUpdateSubProcess?: () => void;
}

export default function CandidateDetailsModal({ applicationId, onClose, application, onUpdateSubProcess }: CandidateDetailsModalProps) {
  const [candidate, setCandidate] = useState<Graduate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'process'>('profile');
  const [scores, setScores] = useState<Record<number, number>>({});
  
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isCompany = user?.role_name === 'COMPANY';

  useEffect(() => {
    fetchCandidate();
  }, [applicationId]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${applicationId}/candidate`);
      setCandidate(res.data);
      
      // Initialize scores from application data
      if (application?.sub_processes) {
        const initialScores: Record<number, number> = {};
        application.sub_processes.forEach((sp: any) => {
          if (sp.score) initialScores[sp.id] = sp.score;
        });
        setScores(initialScores);
      }
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      toast.error('Error al cargar la información del candidato');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubProcessStatus = async (subProcessId: number, newStatus: string) => {
    try {
      const payload: any = { estado: newStatus };
      if (scores[subProcessId]) {
        payload.score = scores[subProcessId];
      }
      await api.put(`/sub-processes/${subProcessId}`, payload);
      toast.success('Estado actualizado');
      if (onUpdateSubProcess) onUpdateSubProcess();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-4xl">
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : candidate ? (
        <>
          <div className="flex flex-col border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex justify-between items-center p-6 pb-2">
              <div>
                <h3 className="text-xl font-bold text-ink font-heading">Perfil del Candidato</h3>
                <p className="text-sm text-brand-600 font-semibold">{candidate.first_name} {candidate.last_name}</p>
              </div>
              <button onClick={onClose} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="px-6 flex gap-6">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-secondary hover:text-ink'}`}
              >
                Perfil Profesional
              </button>
              {application && (
                <button 
                  onClick={() => setActiveTab('process')}
                  className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'process' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-secondary hover:text-ink'}`}
                >
                  Proceso de Selección
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {activeTab === 'profile' ? (
              <>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 p-5 rounded-2xl border w-full" style={{ backgroundColor: 'rgba(8, 116, 67, 0.05)', borderColor: 'rgba(8, 116, 67, 0.2)' }}>
                    <h4 className="text-lg font-bold mb-3" style={{ color: 'var(--accent-primary)' }}>Información de Contacto</h4>
                    <div className="space-y-2">
                      {candidate.email && (
                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Correo:</span> {candidate.email}</p>
                      )}
                      {candidate.phone && (
                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Teléfono:</span> {candidate.phone}</p>
                      )}
                    </div>
                    {candidate.email && (
                      <a href={`mailto:${candidate.email}`} className="mt-4 inline-flex items-center justify-center w-full gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold transition-colors hover:bg-brand-700 shadow-sm">
                        Contactar al Egresado
                      </a>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-[var(--bg-muted)] p-5 rounded-2xl border border-[var(--border-color)] w-full">
                    <h4 className="text-lg font-bold text-ink mb-3">Hoja de Vida (CV)</h4>
                    {candidate.cv_url ? (
                      <a href={`${GRADUATES_URL}${candidate.cv_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm w-full justify-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                        <ExternalLink className="w-4 h-4" /> Ver Hoja de Vida
                      </a>
                    ) : (
                      <p className="text-sm text-ink-secondary italic text-center py-2">
                        El candidato no ha subido su hoja de vida.
                      </p>
                    )}
                  </div>
                </div>

                {candidate.profile_summary && (
                  <div>
                    <h4 className="text-lg font-bold text-ink mb-2">Perfil Profesional</h4>
                    <p className="text-sm text-ink-secondary bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)] leading-relaxed">
                      {candidate.profile_summary}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-bold text-ink mb-3 flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-600" /> Experiencia Laboral</h4>
                  {candidate.experiences && candidate.experiences.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {candidate.experiences.map(exp => (
                        <div key={exp.id} className="card p-4 border border-[var(--border-color)]">
                          <h5 className="font-bold text-ink">{exp.position}</h5>
                          <p className="text-sm font-semibold text-brand-600">{exp.company_name}</p>
                          <p className="text-xs text-ink-secondary mt-1">{new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Presente'}</p>
                          {exp.certificate_url && (
                            <a href={`${GRADUATES_URL}${exp.certificate_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit transition-colors" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                              <FileText className="w-3 h-3" /> Certificado Adjunto
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">El candidato no ha registrado experiencia laboral.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-ink mb-3 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-brand-600" /> Formación Académica</h4>
                  {candidate.academic_histories && candidate.academic_histories.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {candidate.academic_histories.map(edu => (
                        <div key={edu.id} className="card p-4 border border-[var(--border-color)]">
                          <h5 className="font-bold text-ink">{edu.degree}</h5>
                          <p className="text-sm font-semibold text-brand-600">{edu.institution}</p>
                          <p className="text-xs text-ink-secondary mt-1">{new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'En curso'}</p>
                          {edu.diploma_url && (
                            <a href={`${GRADUATES_URL}${edu.diploma_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit transition-colors" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                              <FileText className="w-3 h-3" /> Diploma Adjunto
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">El candidato no ha registrado formación académica.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-ink">Evaluaciones de la Etapa actual</h4>
                </div>
                
                <div className="space-y-3">
                  {application?.sub_processes && application.sub_processes.length > 0 ? (
                    application.sub_processes
                    .filter((sp: any) => sp.etapa_kanban === application.status)
                    .map((sp: any) => (
                      <div key={sp.id} className="card p-4 border border-[var(--border-color)]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-ink-tertiary">{sp.tipo.replace('_', ' ')}</span>
                            <h5 className="font-bold text-ink">{sp.nombre}</h5>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${sp.estado === 'aprobado' ? 'bg-green-100 text-green-700' : sp.estado === 'rechazado' ? 'bg-red-100 text-red-700' : sp.estado === 'completado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {sp.estado}
                          </span>
                        </div>
                        {sp.descripcion && <p className="text-sm text-ink-secondary mt-1">{sp.descripcion}</p>}
                        {sp.enlace_adjunto && (
                          <a href={sp.enlace_adjunto} target="_blank" rel="noreferrer" className="text-brand-600 text-sm font-semibold inline-flex items-center gap-1 mt-2 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" /> Abrir Enlace
                          </a>
                        )}
                        {sp.archivo_respuesta && (
                          <div className="mt-3 p-2 border rounded-lg flex items-center justify-between" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>Entregable subido por el candidato</span>
                            <a href={sp.archivo_respuesta} target="_blank" rel="noreferrer" className="px-3 py-1 text-xs font-bold rounded shadow-sm hover:underline" style={{ backgroundColor: 'var(--bg-surface)', color: '#3b82f6' }}>
                              Descargar / Ver
                            </a>
                          </div>
                        )}
                        
                        {isCompany && (
                          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink-secondary w-20">Puntuación:</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button 
                                    key={star}
                                    onClick={() => setScores(prev => ({ ...prev, [sp.id]: star }))}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                  >
                                    <Star 
                                      className={`w-5 h-5 ${
                                        (scores[sp.id] || 0) >= star 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'fill-transparent text-slate-300'
                                      }`} 
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink-secondary w-20">Acción:</span>
                              <button onClick={() => handleUpdateSubProcessStatus(sp.id, 'aprobado')} className="px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors">Aprobar</button>
                              <button onClick={() => handleUpdateSubProcessStatus(sp.id, 'rechazado')} className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">Rechazar</button>
                              {sp.estado !== 'pendiente' && sp.estado !== 'en_progreso' && (
                                <button onClick={() => handleUpdateSubProcessStatus(sp.id, 'pendiente')} className="px-3 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors ml-auto">Reiniciar</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">No hay sub-procesos configurados para esta etapa.</p>
                  )}
                  {application?.sub_processes?.filter((sp: any) => sp.etapa_kanban === application.status).length === 0 && application?.sub_processes?.length > 0 && (
                    <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">No hay sub-procesos configurados para esta etapa.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </Modal>
  );
}

