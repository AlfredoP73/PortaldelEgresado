import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { graduatesApi, matchmakingApi } from '../../../api';
import { Search, MapPin, Building2, Briefcase, CalendarDays, CheckCircle2, DollarSign, X, FileText } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

interface JobOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  functions: string;
  salary_min: number;
  salary_max: number;
  closing_date: string;
  modality: string;
  contract_type: string;
  company: {
    name: string;
    sector?: { name: string };
    city?: { name: string };
  };
}

interface MatchOut {
  job_offer_id: number;
  score: number;
}

export default function JobBoard() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [applying, setApplying] = useState(false);
  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [matchFilter, setMatchFilter] = useState('ALL');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [contractTypeFilter, setContractTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;
  
  const [successMessage, setSuccessMessage] = useState('');

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const graduateId = user?.id;

  useEffect(() => {
    fetchJobs();
    if (graduateId) {
      matchmakingApi
        .get(`/graduate/${graduateId}?limit=200`)
        .then((res) => {
          const map: Record<number, number> = {};
          res.data.forEach((m: MatchOut) => {
            map[m.job_offer_id] = Number(m.score);
          });
          setMatches(map);
        })
        .catch((error) => console.error('Error fetching matches:', error));
    }
  }, [graduateId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await graduatesApi.get('/jobs');
      setJobs(res.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    try {
      setApplying(true);
      await graduatesApi.post('/applications', { job_offer_id: selectedJob.id });
      setSuccessMessage('¡Te has postulado exitosamente a esta vacante!');
      setTimeout(() => {
        setSuccessMessage('');
        setSelectedJob(null);
      }, 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al postularse');
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSalary = minSalaryFilter ? (job.salary_min && job.salary_min >= Number(minSalaryFilter)) : true;
    const matchSector = sectorFilter === 'ALL' || job.company.sector?.name === sectorFilter;
    const matchCity = cityFilter === 'ALL' || job.company.city?.name === cityFilter;
    const matchModality = modalityFilter === 'ALL' || job.modality === modalityFilter;
    const matchContract = contractTypeFilter === 'ALL' || job.contract_type === contractTypeFilter;
    
    let matchScorePassed = true;
    if (matchFilter !== 'ALL') {
      const score = matches[job.id] || 0;
      matchScorePassed = score >= Number(matchFilter);
    }
    
    return matchSearch && matchSalary && matchSector && matchCity && matchScorePassed && matchModality && matchContract;
  });

  // Ordenar por afinidad de mayor a menor
  filteredJobs.sort((a, b) => {
    const scoreA = matches[a.id] || 0;
    const scoreB = matches[b.id] || 0;
    return scoreB - scoreA;
  });

  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, minSalaryFilter, sectorFilter, cityFilter, matchFilter, modalityFilter, contractTypeFilter]);

  const uniqueSectors = Array.from(new Set(jobs.map(j => j.company.sector?.name).filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(jobs.map(j => j.company.city?.name).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Bolsa de Empleo</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Explora y postúlate a las mejores ofertas para tu perfil.</p>
        </div>
      </div>

      {/* Filters/Search */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
              <input
                type="text"
                placeholder="Buscar por cargo o empresa..."
                className="input pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full md:w-auto">
              <select 
                className="input w-full sm:w-40" 
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
              >
                <option value="ALL">Todos los Sectores</option>
                {uniqueSectors.map((sector: any) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>

              <select 
                className="input w-full sm:w-40" 
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                <option value="ALL">Todas las Ciudades</option>
                {uniqueCities.map((city: any) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select 
                className="input w-full sm:w-40" 
                value={minSalaryFilter}
                onChange={(e) => setMinSalaryFilter(e.target.value)}
              >
                <option value="">Cualquier salario</option>
                <option value="1500000">Desde $1.5M</option>
                <option value="2500000">Desde $2.5M</option>
                <option value="4000000">Desde $4.0M</option>
              </select>

              <select 
                className="input w-full sm:w-40" 
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
              >
                <option value="ALL">Cualquier Modalidad</option>
                <option value="Remoto">Remoto</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
              </select>

              <select 
                className="input w-full sm:w-40" 
                value={contractTypeFilter}
                onChange={(e) => setContractTypeFilter(e.target.value)}
              >
                <option value="ALL">Cualquier Contrato</option>
                <option value="Indefinido">Indefinido</option>
                <option value="Fijo">Término Fijo</option>
                <option value="Prestación de Servicios">Prestación de Servicios</option>
              </select>

              <select 
                className="input w-full sm:w-40" 
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
              >
                <option value="ALL">Cualquier Afinidad</option>
                <option value="50">Mayor a 50%</option>
                <option value="75">Mayor a 75%</option>
                <option value="90">Mayor a 90%</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        filteredJobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-ink">No hay vacantes disponibles</h3>
            <p className="text-ink-secondary mt-2 max-w-md mx-auto">Actualmente no hay ofertas laborales que coincidan con tu búsqueda. Intenta con otros términos o vuelve más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map(job => (
              <div key={job.id} className="card p-6 flex flex-col hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={() => setSelectedJob(job)}>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-ink group-hover:text-brand-600 transition-colors line-clamp-1">{job.title}</h3>
                  <p className="text-ink-secondary font-medium mt-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {job.company.name}
                  </p>
                  {matches[job.id] !== undefined && (
                    <span className={twMerge(
                      'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                      matches[job.id] >= 75 ? 'bg-green-100 text-green-700' :
                      matches[job.id] >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {Math.round(matches[job.id])}% de afinidad
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-ink-tertiary">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <span>{job.company.city?.name || 'Ubicación no especificada'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-tertiary">
                    <DollarSign className="w-4 h-4 text-brand-500" />
                    <span>
                      {job.salary_min && job.salary_max 
                        ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                        : 'Salario a convenir'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-tertiary">
                    <CalendarDays className="w-4 h-4 text-brand-500" />
                    <span>Cierra: {new Date(job.closing_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-tertiary">
                    <CheckCircle2 className="w-4 h-4 text-brand-500" />
                    <span>{job.modality || 'Presencial'} • {job.contract_type || 'Indefinido'}</span>
                  </div>
                </div>

                <button className="w-full btn-ghost border border-brand-200 text-brand-700 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  Ver Detalles
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {filteredJobs.length > pageSize && (
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredJobs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        maxWidth="max-w-3xl"
      >
        {selectedJob && (
          <>
            {/* Modal Header */}
            <div 
              className="p-6 border-b flex justify-between items-start gap-4 shrink-0"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-ink leading-snug">
                    {selectedJob.title}
                  </h3>
                  {matches[selectedJob.id] !== undefined && (
                    <span className={twMerge(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0',
                      matches[selectedJob.id] >= 75 ? 'bg-green-100 text-green-700' :
                      matches[selectedJob.id] >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {Math.round(matches[selectedJob.id])}% de afinidad
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary pt-0.5">
                  <span className="font-semibold text-brand-600 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 shrink-0" />
                    {selectedJob.company.name}
                  </span>
                  {selectedJob.company.sector?.name && (
                    <span className="text-ink-tertiary">
                      • {selectedJob.company.sector.name}
                    </span>
                  )}
                  {selectedJob.company.city?.name && (
                    <span className="flex items-center gap-1 text-ink-tertiary">
                      <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      {selectedJob.company.city.name}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="transition-colors p-2 rounded-full hover-bg-muted shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Summary Cards */}
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">Rango Salarial</p>
                    <p className="text-sm font-bold text-ink">
                      {selectedJob.salary_min && selectedJob.salary_max
                        ? `$${selectedJob.salary_min.toLocaleString()} - $${selectedJob.salary_max.toLocaleString()}`
                        : 'Salario a convenir'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">Fecha de Cierre</p>
                    <p className="text-sm font-bold text-ink">
                      {selectedJob.closing_date 
                        ? new Date(selectedJob.closing_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'No especificada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vacancy Description */}
              {selectedJob.description && (
                <div className="space-y-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2 uppercase tracking-wide">
                    <Briefcase className="w-4 h-4 text-brand-600" />
                    Descripción de la vacante
                  </h4>
                  <div 
                    className="p-4 rounded-xl border text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    {selectedJob.description}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && (
                <div className="space-y-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    Requisitos
                  </h4>
                  <div 
                    className="p-4 rounded-xl border text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    {selectedJob.requirements}
                  </div>
                </div>
              )}

              {/* Functions */}
              {selectedJob.functions && (
                <div className="space-y-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2 uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-brand-600" />
                    Funciones del cargo
                  </h4>
                  <div 
                    className="p-4 rounded-xl border text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    {selectedJob.functions}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-6 border-t shrink-0 flex flex-col gap-3"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedJob(null)} 
                  className="btn-outline flex-1 justify-center"
                >
                  Cerrar
                </button>
                <button 
                  onClick={handleApply} 
                  disabled={applying || !!successMessage} 
                  className="btn-primary flex-1 justify-center shadow-lg shadow-brand-500/20"
                >
                  {applying ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : successMessage ? (
                    '¡Postulado con éxito!'
                  ) : (
                    'Postularme Ahora'
                  )}
                </button>
              </div>

              {successMessage && (
                <div className="p-3 rounded-xl border flex items-center gap-2.5 animate-fade-in text-sm font-semibold" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

