import { useState, useEffect } from 'react';
import api, { matchmakingApi } from '../../../api';
import { Users, GraduationCap, Phone, ExternalLink, X, FileText, Mail, Briefcase, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL || 'http://localhost:8003';

interface JobOffer {
  id: number;
  title: string;
}

interface MatchOut {
  graduate_id: number;
  score: number;
}

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
  email?: string;
  phone?: string;
  cv_url?: string;
  profile_summary?: string;
  experiences?: WorkExperience[];
  academic_histories?: AcademicHistory[];
}

export default function CompanyTalentPool() {
    const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGraduate, setSelectedGraduate] = useState<Graduate | null>(null);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [matches, setMatches] = useState<Record<number, number>>({});
  
  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [minMatchFilter, setMinMatchFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchGraduates();
    fetchJobOffers();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setMatches({});
      return;
    }
    fetchMatches(Number(selectedJobId));
  }, [selectedJobId]);

  const fetchMatches = async (jobOfferId: number) => {
    try {
      const res = await matchmakingApi.get(`/vacancy/${jobOfferId}?limit=200`);
      const map: Record<number, number> = {};
      res.data.forEach((m: MatchOut) => {
        map[m.graduate_id] = Number(m.score);
      });
      setMatches(map);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches({});
    }
  };

  const fetchJobOffers = async () => {
    try {
      const res = await api.get('/jobs');
      setJobOffers(res.data);
    } catch (error) {
      console.error('Error fetching job offers:', error);
    }
  };

  const fetchGraduates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs');
      setGraduates(res.data);
    } catch (error) {
      console.error('Error fetching talent pool:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-ink font-heading">{'Talento Humano'}</h2>
          <p className="text-sm mt-1 text-ink-secondary">{'Explora el banco de talentos disponibles.'}</p>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-80">
          <label htmlFor="job-select" className="text-xs font-bold text-ink-secondary uppercase tracking-wider">{'Vacante para calcular afinidad'}</label>
          <select
            id="job-select"
            className="input w-full"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">{'Selecciona una vacante...'}</option>
            {jobOffers.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : graduates.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-ink">{'No hay talento registrado aún'}</h3>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
                <input
                  type="text"
                  placeholder={'Buscar por nombre del profesional...'}
                  className="input w-full pl-9"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <select 
                  className="input w-full sm:w-48" 
                  value={minMatchFilter} 
                  onChange={(e) => { setMinMatchFilter(e.target.value); setCurrentPage(1); }}
                  disabled={!selectedJobId}
                >
                  <option value="ALL">{'Cualquier Afinidad'}</option>
                  <option value="50">{'Mayor a 50%'}</option>
                  <option value="75">{'Mayor a 75%'}</option>
                  <option value="90">{'Mayor a 90%'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Profesional'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Formación'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Afinidad'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Contacto Directo'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider text-right">{'ACCIONES'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {(() => {
                  const filteredGraduates = graduates.filter(grad => {
                    const fullName = `${grad.first_name} ${grad.last_name}`.toLowerCase();
                    const matchSearch = fullName.includes(searchTerm.toLowerCase());
                    
                    let matchScorePassed = true;
                    if (minMatchFilter !== 'ALL' && selectedJobId) {
                      const score = matches[grad.user_id] || 0;
                      matchScorePassed = score >= Number(minMatchFilter);
                    }
                    
                    return matchSearch && matchScorePassed;
                  });

                  // Si hay una vacante seleccionada, ordenar por afinidad de mayor a menor
                  if (selectedJobId) {
                    filteredGraduates.sort((a, b) => {
                      const scoreA = matches[a.user_id] || 0;
                      const scoreB = matches[b.user_id] || 0;
                      return scoreB - scoreA;
                    });
                  }

                  const paginatedGraduates = filteredGraduates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                  if (filteredGraduates.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-ink-secondary italic">
                          {'No se encontraron talentos que coincidan con los filtros.'}
                        </td>
                      </tr>
                    );
                  }

                  return paginatedGraduates.map(grad => (
                  <tr key={grad.user_id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-brand-600 shrink-0">
                          {grad.first_name.charAt(0)}{grad.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-ink">{grad.first_name} {grad.last_name}</p>
                          {grad.profile_summary ? (
                            <p className="text-xs text-ink-secondary truncate max-w-[200px] mt-0.5">{grad.profile_summary}</p>
                          ) : (
                            <p className="text-xs text-ink-secondary mt-0.5 italic">{'Sin resumen'}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-ink-secondary">
                        <span className="flex items-center gap-1.5 font-semibold text-brand-700"><GraduationCap className="w-3.5 h-3.5" /> {'Año'}: {grad.graduation_year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {matches[grad.user_id] !== undefined ? (
                        <span className={twMerge(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
                          matches[grad.user_id] >= 75 ? 'bg-green-100 text-green-700' :
                          matches[grad.user_id] >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {Math.round(matches[grad.user_id])}%
                        </span>
                      ) : (
                        <span className="text-xs text-ink-tertiary italic">{'Sin vacante seleccionada'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs text-ink-secondary">
                        {grad.email ? (
                           <a href={`mailto:${grad.email}`} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-800 transition-colors">
                             <Mail className="w-3.5 h-3.5" /> {grad.email}
                           </a>
                        ) : (
                          <span className="text-ink-tertiary">{'Correo N/A'}</span>
                        )}
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {grad.phone || 'Teléfono N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedGraduate(grad)} className="inline-flex items-center gap-1 bg-ink-50 text-ink hover:bg-ink-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-transparent hover:border-ink-200 shadow-sm">
                          {'Ver Perfil Completo'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
                })()}
              </tbody>
            </table>
          </div>
          {graduates.length > pageSize && (
            <Pagination 
              currentPage={currentPage}
              totalItems={graduates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      <Modal isOpen={!!selectedGraduate} onClose={() => setSelectedGraduate(null)} maxWidth="max-w-4xl">
        {selectedGraduate && (
          <>
            <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <h3 className="text-xl font-bold text-ink font-heading">{'Perfil de Talento'}</h3>
                <p className="text-sm text-brand-600 font-semibold">{selectedGraduate.first_name} {selectedGraduate.last_name}</p>
              </div>
              <button onClick={() => setSelectedGraduate(null)} className="text-ink-tertiary hover:text-ink p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Contact & CV Row */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 bg-brand-50 dark:bg-brand-950/20 p-5 rounded-2xl border border-brand-100 dark:border-brand-900/30 w-full">
                  <h4 className="text-lg font-bold text-brand-900 dark:text-brand-300 mb-3">{'Información de Contacto'}</h4>
                  <div className="space-y-2">
                    {selectedGraduate.email && (
                      <p className="text-sm text-brand-800 dark:text-brand-400"><span className="font-semibold">{'Correo'}:</span> {selectedGraduate.email}</p>
                    )}
                    {selectedGraduate.phone && (
                      <p className="text-sm text-brand-800 dark:text-brand-400"><span className="font-semibold">{'Teléfono:'}</span> {selectedGraduate.phone}</p>
                    )}
                  </div>
                  {selectedGraduate.email && (
                    <a href={`mailto:${selectedGraduate.email}`} className="mt-4 inline-flex items-center justify-center w-full gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold transition-colors hover:bg-brand-700 shadow-sm">
                      {'Contactar Directamente'}
                    </a>
                  )}
                </div>
                
                <div className="flex-1 bg-[var(--bg-muted)] p-5 rounded-2xl border border-[var(--border-color)] w-full">
                  <h4 className="text-lg font-bold text-ink mb-3">{'Hoja de Vida (CV)'}</h4>
                  {selectedGraduate.cv_url ? (
                    <a href={`${GRADUATES_URL}${selectedGraduate.cv_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-brand-700 dark:text-brand-400 px-4 py-2 rounded-xl font-bold transition-colors hover:bg-brand-50 border border-brand-200 dark:border-brand-800 shadow-sm w-full justify-center">
                      <ExternalLink className="w-4 h-4" /> {'Ver Hoja de Vida'}
                    </a>
                  ) : (
                    <p className="text-sm text-ink-secondary italic text-center py-2">
                      {'El talento no ha subido su hoja de vida.'}
                    </p>
                  )}
                </div>
              </div>

              {selectedGraduate.profile_summary && (
                <div>
                  <h4 className="text-lg font-bold text-ink mb-2">{'Perfil Profesional'}</h4>
                  <p className="text-sm text-ink-secondary bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)] leading-relaxed">
                    {selectedGraduate.profile_summary}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-lg font-bold text-ink mb-3 flex items-center gap-2"><Briefcase className="w-5 h-5 text-brand-600" /> {'Experiencia Laboral'}</h4>
                {selectedGraduate.experiences && selectedGraduate.experiences.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedGraduate.experiences.map(exp => (
                      <div key={exp.id} className="card p-4 border border-[var(--border-color)]">
                        <h5 className="font-bold text-ink">{exp.position}</h5>
                        <p className="text-sm font-semibold text-brand-600">{exp.company_name}</p>
                        <p className="text-xs text-ink-secondary mt-1">{new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Presente'}</p>
                        {exp.certificate_url && (
                          <a href={`${GRADUATES_URL}${exp.certificate_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 rounded-lg text-xs font-bold w-fit transition-colors hover:bg-green-100">
                            <FileText className="w-3 h-3" /> {'Certificado Adjunto'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{'El talento no ha registrado experiencia laboral.'}</p>
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-ink mb-3 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-brand-600" /> {'Formación Académica'}</h4>
                {selectedGraduate.academic_histories && selectedGraduate.academic_histories.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedGraduate.academic_histories.map(edu => (
                      <div key={edu.id} className="card p-4 border border-[var(--border-color)]">
                        <h5 className="font-bold text-ink">{edu.degree}</h5>
                        <p className="text-sm font-semibold text-brand-600">{edu.institution}</p>
                        <p className="text-xs text-ink-secondary mt-1">{new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'En curso'}</p>
                        {edu.diploma_url && (
                          <a href={`${GRADUATES_URL}${edu.diploma_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg text-xs font-bold w-fit transition-colors hover:bg-blue-100">
                            <FileText className="w-3 h-3" /> {'Diploma Adjunto'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{'El talento no ha registrado formación académica.'}</p>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

