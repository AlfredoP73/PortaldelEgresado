import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { graduatesApi, matchmakingApi } from '../../../api';
import {
  Search, MapPin, Building2, Briefcase, CalendarDays, CheckCircle2,
  DollarSign, X, FileText, Bookmark, BookmarkCheck, Sparkles, Plus, AlertCircle
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Joyride } from 'react-joyride';
import type { Step } from 'react-joyride';

interface JobOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  functions: string;
  salary_min: number;
  salary_max: number;
  min_experience_years?: number;
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

interface AffinityBreakdown {
  job_offer_id: number;
  total_score: number;
  skills_score: number;
  program_score: number;
  experience_score: number;
  matched_skills: { skill_id: number; name: string; proficiency_level: string; required_level: string }[];
  missing_skills: { skill_id: number; name: string; required_level: string }[];
  program_match: { matched: boolean; graduate_program_id?: number; job_program_id?: number };
  experience_match: { matched: boolean; graduate_years: number; required_years: number };
  salary_alignment: { aligned: boolean; expected_salary?: number; salary_min?: number; salary_max?: number };
  recommended_pitch: string;
}

export default function GraduateMatchmaking() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [savedJobIds, setSavedJobIds] = useState<number[]>(() => {
    try {
      const cached = localStorage.getItem('upc_saved_jobs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [breakdown, setBreakdown] = useState<AffinityBreakdown | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [addingSkillId, setAddingSkillId] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);

  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [contractTypeFilter, setContractTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;
  
  const [successMessage, setSuccessMessage] = useState('');

  const [{ run, steps }] = useState({
    run: true,
    steps: [
      {
        target: '.page-title',
        content: '¡Descubre ofertas hechas a tu medida! Aquí te sugerimos vacantes basadas en la afinidad con tu perfil.',
        disableBeacon: true,
      },
      {
        target: '.filters-section',
        content: 'Usa estos filtros para afinar tu búsqueda por salario, sector, ciudad o modalidad.',
      },
      {
        target: '.job-card',
        content: 'Haz clic en una oferta para ver la radiografía de afinidad, brecha de habilidades y postularte.',
      }
    ] as Step[]
  });

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const graduateId = user?.id;

  const refreshMatches = () => {
    if (!graduateId) return;
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
  };

  useEffect(() => {
    fetchJobs();
    fetchSavedJobs();
    if (graduateId) {
      refreshMatches();
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

  const fetchSavedJobs = async () => {
    try {
      const res = await graduatesApi.get('/saved-jobs');
      if (Array.isArray(res.data?.saved_job_ids)) {
        setSavedJobIds(res.data.saved_job_ids);
        localStorage.setItem('upc_saved_jobs', JSON.stringify(res.data.saved_job_ids));
      }
    } catch {
      // Keep localStorage fallback
    }
  };

  const handleToggleBookmark = async (jobId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlySaved = savedJobIds.includes(jobId);
    const updated = isCurrentlySaved
      ? savedJobIds.filter((id) => id !== jobId)
      : [...savedJobIds, jobId];

    setSavedJobIds(updated);
    localStorage.setItem('upc_saved_jobs', JSON.stringify(updated));
    toast.success(isCurrentlySaved ? 'Vacante removida de guardadas' : 'Vacante guardada en tus favoritos');

    try {
      const res = await graduatesApi.post(`/saved-jobs/${jobId}`);
      if (Array.isArray(res.data?.saved_job_ids)) {
        setSavedJobIds(res.data.saved_job_ids);
        localStorage.setItem('upc_saved_jobs', JSON.stringify(res.data.saved_job_ids));
      }
    } catch {
      // Optimistic state already persisted in localStorage
    }
  };

  const openJobModal = async (job: JobOffer) => {
    setSelectedJob(job);
    setSuccessMessage('');
    setCoverLetter('');
    setBreakdown(null);
    try {
      setLoadingBreakdown(true);
      const res = await graduatesApi.get(`/jobs/${job.id}/affinity-breakdown`);
      setBreakdown(res.data);
    } catch {
      const fallbackScore = Math.round(matches[job.id] || 75);
      setBreakdown({
        job_offer_id: job.id,
        total_score: fallbackScore,
        skills_score: fallbackScore,
        program_score: 100,
        experience_score: 85,
        matched_skills: [],
        missing_skills: [],
        program_match: { matched: true },
        experience_match: { matched: true, graduate_years: 1, required_years: job.min_experience_years || 0 },
        salary_alignment: { aligned: true, salary_min: job.salary_min, salary_max: job.salary_max },
        recommended_pitch: `Hola equipo de ${job.company.name}, soy egresado de la UPC con alta motivación para aportar en el cargo de ${job.title}. Cuento con formación sólida y disponibilidad inmediata.`,
      });
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleQuickAddSkill = async (skillId: number, skillName: string) => {
    if (!selectedJob) return;
    try {
      setAddingSkillId(skillId);
      await graduatesApi.post('/profile/skills/quick-add', {
        skill_id: skillId,
        skill_name: skillName,
        proficiency_level: 'Intermedio',
      });
      toast.success(`"${skillName}" agregada a tu perfil. ¡Afinidad actualizada!`);
      const res = await graduatesApi.get(`/jobs/${selectedJob.id}/affinity-breakdown`);
      setBreakdown(res.data);
      if (res.data?.total_score) {
        setMatches((prev) => ({ ...prev, [selectedJob.id]: Number(res.data.total_score) }));
      }
      refreshMatches();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Completa primero tus datos básicos en Mi Perfil');
    } finally {
      setAddingSkillId(null);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    try {
      setApplying(true);
      await graduatesApi.post('/applications', {
        job_offer_id: selectedJob.id,
        cover_letter: coverLetter.trim() || undefined,
      });
      setSuccessMessage('¡Te has postulado exitosamente a esta vacante!');
      setTimeout(() => {
        setSuccessMessage('');
        setSelectedJob(null);
      }, 2500);
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
    
    const score = matches[job.id] || 0;
    const matchScorePassed = score > 0;
    
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
  }, [searchTerm, minSalaryFilter, sectorFilter, cityFilter, modalityFilter, contractTypeFilter]);

  const uniqueSectors = Array.from(new Set(jobs.map(j => j.company.sector?.name).filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(jobs.map(j => j.company.city?.name).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight page-title" style={{ color: 'var(--text-main)' }}>Sugeridas para ti</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Vacantes recomendadas por IA según la afinidad de tu perfil y habilidades.</p>
        </div>
      </div>

      {/* Filters/Search */}
      <div className="card overflow-hidden filters-section">
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTheme baseColor="var(--bg-muted)" highlightColor="var(--bg-surface)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="card p-6 flex flex-col h-[280px]">
                <div className="mb-4">
                  <Skeleton height={24} width="80%" className="mb-2" />
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={20} width={100} className="mt-3 rounded-full" />
                </div>
                <div className="space-y-3 mb-6 flex-1">
                  <Skeleton height={16} width="90%" />
                  <Skeleton height={16} width="70%" />
                  <Skeleton height={16} width="80%" />
                </div>
                <Skeleton height={40} className="rounded-lg" />
              </div>
            ))}
          </div>
        </SkeletonTheme>
      ) : (
        filteredJobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-ink">No hay recomendaciones por ahora</h3>
            <p className="text-ink-secondary mt-2 max-w-md mx-auto">Asegúrate de completar tus habilidades y experiencia en el perfil para que podamos sugerirte las mejores ofertas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map(job => {
              const isSaved = savedJobIds.includes(job.id);
              return (
                <div key={job.id} className="card p-6 flex flex-col hover:-translate-y-1 transition-all duration-300 group cursor-pointer job-card relative" onClick={() => openJobModal(job)}>
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-ink group-hover:text-brand-600 transition-colors line-clamp-1">{job.title}</h3>
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(job.id, e)}
                        className={twMerge(
                          'p-2 rounded-xl border transition-all shrink-0',
                          isSaved
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'border-[var(--border-color)] text-ink-tertiary hover:text-brand-600 hover:border-brand-300'
                        )}
                        title={isSaved ? 'Guardada en favoritos' : 'Guardar vacante'}
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>
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
                        <Sparkles className="w-3.5 h-3.5" />
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
                    Ver Radiografía y Postular
                  </button>
                </div>
              );
            })}
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
                      <Sparkles className="w-3.5 h-3.5" />
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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(selectedJob.id, e)}
                  className={twMerge(
                    'p-2 rounded-full border transition-all',
                    savedJobIds.includes(selectedJob.id)
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'border-[var(--border-color)] text-ink-tertiary hover:text-brand-600'
                  )}
                  title="Guardar vacante"
                >
                  {savedJobIds.includes(selectedJob.id) ? (
                    <BookmarkCheck className="w-5 h-5 fill-amber-500" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="transition-colors p-2 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

              {/* Radiografía de Afinidad y Brecha de Habilidades (Skill Gap Analyzer) */}
              <div
                className="p-5 rounded-2xl border space-y-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.04))',
                  borderColor: 'rgba(16,185,129,0.25)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-600" />
                    <h4 className="font-bold text-ink text-sm uppercase tracking-wide">
                      Radiografía de Afinidad y Brecha de Habilidades
                    </h4>
                  </div>
                  {breakdown && (
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-brand-600 text-white">
                      Puntaje Global: {Math.round(breakdown.total_score)}%
                    </span>
                  )}
                </div>

                {loadingBreakdown ? (
                  <p className="text-xs text-ink-secondary animate-pulse">Analizando tu perfil frente a esta vacante...</p>
                ) : breakdown ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-ink-secondary">Habilidades (50%)</span>
                          <span className="text-brand-600">{Math.round(breakdown.skills_score)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, breakdown.skills_score)}%` }} />
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-ink-secondary">Programa (30%)</span>
                          <span className="text-emerald-600">{Math.round(breakdown.program_score)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, breakdown.program_score)}%` }} />
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-ink-secondary">Experiencia (20%)</span>
                          <span className="text-blue-600">{Math.round(breakdown.experience_score)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, breakdown.experience_score)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Habilidades que ya dominas ({breakdown.matched_skills.length})
                        </p>
                        {breakdown.matched_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {breakdown.matched_skills.map((sk) => (
                              <span
                                key={sk.skill_id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"
                              >
                                ✓ {sk.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-ink-tertiary italic">Aún no registras habilidades coincidentes en tu perfil.</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> Brecha de Habilidades ({breakdown.missing_skills.length})
                        </p>
                        {breakdown.missing_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {breakdown.missing_skills.map((sk) => (
                              <button
                                key={sk.skill_id}
                                type="button"
                                disabled={addingSkillId === sk.skill_id}
                                onClick={() => handleQuickAddSkill(sk.skill_id, sk.name)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 hover:bg-emerald-600 text-amber-900 hover:text-white transition-all border border-amber-300"
                                title="Haz clic si ya dominas esta habilidad para agregarla a tu perfil y recalcular tu afinidad"
                              >
                                <Plus className="w-3 h-3" />
                                {addingSkillId === sk.skill_id ? 'Agregando...' : `${sk.name} · + La tengo`}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 font-semibold">¡Excelente! Cumples todas las competencias técnicas requeridas.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
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

              {/* Carta de Presentación / Pitch Rápido */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-ink text-sm flex items-center gap-2 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Nota de Presentación / Pitch para el Reclutador (Opcional)
                  </h4>
                  {breakdown?.recommended_pitch && (
                    <button
                      type="button"
                      onClick={() => setCoverLetter(breakdown.recommended_pitch)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200 transition-colors"
                    >
                      ✨ Autogenerar Pitch con mis fortalezas
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Destaca en 2 líneas por qué eres el candidato ideal para este rol o haz clic en 'Autogenerar Pitch'..."
                  className="input w-full text-sm"
                />
              </div>
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
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        options={{
          showProgress: true,
          buttons: ['back', 'skip', 'primary']
        }}
        locale={{ last: 'Finalizar', next: 'Siguiente', skip: 'Saltar Tour', back: 'Atrás' }}
      />
    </div>
  );
}
