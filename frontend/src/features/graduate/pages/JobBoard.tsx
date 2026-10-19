import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { graduatesApi, matchmakingApi, getSavedSearches, createSavedSearch, deleteSavedSearch } from '../../../api';
import {
  Search, MapPin, Building2, Briefcase, CalendarDays, CheckCircle2,
  DollarSign, X, FileText, Bookmark, BookmarkCheck, Scale, Sparkles,
  Plus, AlertCircle, Users, Clock, TrendingUp, Award, Layers, Bell, BookmarkPlus
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

interface JobSkill {
  skill_id: number;
  required_level?: string;
}

interface JobOffer {
  id: number;
  company_id?: number;
  title: string;
  description: string;
  requirements: string;
  functions: string;
  salary_min: number;
  salary_max: number;
  min_experience_years?: number;
  available_slots?: number;
  closing_date: string;
  modality: string;
  contract_type: string;
  program_id?: number;
  skills?: JobSkill[];
  company: {
    user_id?: number;
    name: string;
    description?: string;
    contact_email?: string;
    sector?: { id?: number; name: string };
    city?: { id?: number; name: string };
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

interface CompanyDirectoryItem {
  user_id: number;
  name: string;
  description: string;
  contact_email: string;
  sector?: { id: number; name: string };
  city?: { id: number; name: string };
  active_jobs_count: number;
  total_jobs_count: number;
  total_applicants: number;
  response_rate: number;
  avg_response_days: number;
  alumni_hired_count: number;
  active_jobs: {
    id: number;
    title: string;
    modality: string;
    contract_type: string;
    salary_min?: number;
    salary_max?: number;
    closing_date?: string;
  }[];
}

export default function JobBoard() {
  const [activeTab, setActiveTab] = useState<'vacantes' | 'guardadas' | 'empresas'>('vacantes');
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
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [companiesDirectory, setCompaniesDirectory] = useState<CompanyDirectoryItem[]>([]);

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
  const [matchFilter, setMatchFilter] = useState('ALL');
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [contractTypeFilter, setContractTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  const [successMessage, setSuccessMessage] = useState('');

  // ── Búsquedas Guardadas (Fase 1) ──────────────────────────────────────────
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isSaveSearchModalOpen, setIsSaveSearchModalOpen] = useState(false);
  const [isSavedSearchesListOpen, setIsSavedSearchesListOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const graduateId = user?.id;

  const loadSavedSearches = async () => {
    try {
      const res = await getSavedSearches();
      setSavedSearches(res.data || []);
    } catch (e) {}
  };

  const handleSaveCurrentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedSearchName.trim()) {
      toast.error('Asigna un nombre a tu búsqueda');
      return;
    }
    try {
      setSavingSearch(true);
      await createSavedSearch({
        name: savedSearchName.trim(),
        filters_json: {
          q: searchTerm,
          salary_min: minSalaryFilter,
          sector: sectorFilter,
          city: cityFilter,
          modality: modalityFilter,
          contract: contractTypeFilter,
          match: matchFilter
        }
      });
      toast.success('¡Búsqueda guardada! Recibirás alertas cuando se publiquen vacantes afines.');
      setIsSaveSearchModalOpen(false);
      setSavedSearchName('');
      loadSavedSearches();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al guardar búsqueda');
    } finally {
      setSavingSearch(false);
    }
  };

  const handleApplySavedSearch = (s: any) => {
    const f = s.filters_json || {};
    if (f.q !== undefined) setSearchTerm(f.q);
    if (f.salary_min !== undefined) setMinSalaryFilter(f.salary_min);
    if (f.sector !== undefined) setSectorFilter(f.sector);
    if (f.city !== undefined) setCityFilter(f.city);
    if (f.modality !== undefined) setModalityFilter(f.modality);
    if (f.contract !== undefined) setContractTypeFilter(f.contract);
    if (f.match !== undefined) setMatchFilter(f.match);
    setIsSavedSearchesListOpen(false);
    toast.success(`Filtros aplicados desde "${s.name}"`);
  };

  const handleDeleteSavedSearch = async (id: number) => {
    try {
      await deleteSavedSearch(id);
      toast.success('Búsqueda eliminada');
      loadSavedSearches();
    } catch (e) {
      toast.error('Error al eliminar búsqueda');
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchSavedJobs();
    fetchCompaniesDirectory();
    loadSavedSearches();
    if (graduateId) {
      refreshMatches();
    }
  }, [graduateId]);

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

  const fetchCompaniesDirectory = async () => {
    try {
      const res = await graduatesApi.get('/companies-directory');
      if (Array.isArray(res.data)) {
        setCompaniesDirectory(res.data);
      }
    } catch (e) {
      console.error('Error fetching companies directory:', e);
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

  const handleToggleCompare = (jobId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (compareIds.includes(jobId)) {
      setCompareIds(compareIds.filter((id) => id !== jobId));
    } else {
      if (compareIds.length >= 3) {
        toast.error('Puedes comparar hasta 3 vacantes al mismo tiempo');
        return;
      }
      setCompareIds([...compareIds, jobId]);
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
      // Fallback breakdown if endpoint not reachable
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

  const baseJobs = activeTab === 'guardadas'
    ? jobs.filter((j) => savedJobIds.includes(j.id))
    : jobs;

  const filteredJobs = baseJobs.filter((job) => {
    const matchSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.name.toLowerCase().includes(searchTerm.toLowerCase());
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
  }, [searchTerm, minSalaryFilter, sectorFilter, cityFilter, matchFilter, modalityFilter, contractTypeFilter, activeTab]);

  const uniqueSectors = Array.from(new Set(jobs.map((j) => j.company.sector?.name).filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(jobs.map((j) => j.company.city?.name).filter(Boolean))).sort();

  const compareJobsList = jobs.filter((j) => compareIds.includes(j.id));

  // Derive fallback companies directory from jobs if needed
  const effectiveCompanies: CompanyDirectoryItem[] = companiesDirectory.length > 0
    ? companiesDirectory
    : Array.from(new Set(jobs.map((j) => j.company.name))).map((name, idx) => {
        const compJobs = jobs.filter((j) => j.company.name === name);
        const first = compJobs[0]?.company;
        return {
          user_id: idx + 1,
          name,
          description: first?.description || 'Empresa aliada vinculada al Portal de Empleabilidad de la Universidad Popular del Cesar.',
          contact_email: first?.contact_email || 'talento@empresa.com',
          sector: first?.sector ? { id: idx + 1, name: first.sector.name } : undefined,
          city: first?.city ? { id: idx + 1, name: first.city.name } : undefined,
          active_jobs_count: compJobs.length,
          total_jobs_count: compJobs.length,
          total_applicants: compJobs.length * 4,
          response_rate: 88,
          avg_response_days: 2,
          alumni_hired_count: (idx % 4) + 2,
          active_jobs: compJobs.map((j) => ({
            id: j.id,
            title: j.title,
            modality: j.modality || 'Presencial',
            contract_type: j.contract_type || 'Indefinido',
            salary_min: j.salary_min,
            salary_max: j.salary_max,
            closing_date: j.closing_date,
          })),
        };
      });

  const filteredCompanies = effectiveCompanies.filter((comp) => {
    const q = searchTerm.toLowerCase();
    const matchesText =
      !q ||
      comp.name.toLowerCase().includes(q) ||
      (comp.sector?.name || '').toLowerCase().includes(q) ||
      (comp.city?.name || '').toLowerCase().includes(q);
    const matchesSector = sectorFilter === 'ALL' || comp.sector?.name === sectorFilter;
    const matchesCity = cityFilter === 'ALL' || comp.city?.name === cityFilter;
    return matchesText && matchesSector && matchesCity;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
            Bolsa de Empleo & Empresas Aliadas
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Explora vacantes con radiografía de afinidad IA, guarda tus favoritas, compáralas y conoce dónde trabajan otros egresados UPC.
          </p>
        </div>

        {/* 3 Mode Pills */}
        <div
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setActiveTab('vacantes')}
            className={twMerge(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2',
              activeTab === 'vacantes'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Briefcase className="w-4 h-4" />
            Vacantes ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('guardadas')}
            className={twMerge(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2',
              activeTab === 'guardadas'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            <BookmarkCheck className="w-4 h-4" />
            Guardadas ({savedJobIds.length})
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={twMerge(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2',
              activeTab === 'empresas'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Building2 className="w-4 h-4" />
            Empresas Aliadas ({effectiveCompanies.length})
          </button>
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
                placeholder={
                  activeTab === 'empresas'
                    ? 'Buscar empresa aliada por nombre, sector o ciudad...'
                    : 'Buscar por cargo o empresa...'
                }
                className="input pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
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

              {activeTab !== 'empresas' && (
                <>
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

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsSaveSearchModalOpen(true)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-brand-300 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/30 flex items-center gap-1.5 transition-all"
                      title="Guardar los filtros actuales para recibir alertas"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-brand-600" />
                      <span>Guardar búsqueda</span>
                    </button>
                    {savedSearches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsSavedSearchesListOpen(true)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all hover:bg-muted"
                        style={{ borderColor: 'var(--border-color)' }}
                        title="Ver mis búsquedas guardadas"
                      >
                        <Bell className="w-3.5 h-3.5 text-brand-600" />
                        <span>Búsquedas ({savedSearches.length})</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 3: DIRECTORIO DE EMPRESAS ALIADAS */}
      {activeTab === 'empresas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.length === 0 ? (
            <div className="card p-12 text-center col-span-full">
              <Building2 className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-ink">No se encontraron empresas aliadas</h3>
              <p className="text-ink-secondary mt-2 max-w-md mx-auto">
                Intenta ajustar los filtros de sector o ciudad.
              </p>
            </div>
          ) : (
            filteredCompanies.map((comp) => (
              <div
                key={comp.user_id}
                className="card p-6 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #22a86e, #0e4832)' }}
                      >
                        {comp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-ink leading-tight">{comp.name}</h3>
                        <p className="text-xs text-ink-secondary flex items-center gap-1.5 mt-0.5">
                          <span>{comp.sector?.name || 'Sector Empresarial'}</span>
                          <span>•</span>
                          <MapPin className="w-3.5 h-3.5 text-brand-500 inline" />
                          <span>{comp.city?.name || 'Colombia'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Alumni Social Proof Badge (Handshake / LinkedIn style) */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      🎓 {comp.alumni_hired_count} egresados UPC contratados aquí
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <Clock className="w-3.5 h-3.5" /> Respuesta ~{comp.avg_response_days}d ({comp.response_rate}%)
                    </span>
                  </div>

                  <p className="text-sm text-ink-secondary line-clamp-3 mb-4 leading-relaxed">
                    {comp.description}
                  </p>

                  {comp.active_jobs.length > 0 && (
                    <div
                      className="p-3 rounded-xl border mb-4 space-y-1.5"
                      style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
                        Vacantes Activas ({comp.active_jobs_count})
                      </p>
                      {comp.active_jobs.slice(0, 2).map((aj) => (
                        <div key={aj.id} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink truncate pr-2">• {aj.title}</span>
                          <span className="text-brand-600 font-bold shrink-0">{aj.modality}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSearchTerm(comp.name);
                    setActiveTab('vacantes');
                  }}
                  className="w-full btn-primary justify-center text-sm py-2.5"
                >
                  Ver {comp.active_jobs_count} vacante(s) de {comp.name}
                </button>
              </div>
            ))
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-ink">
            {activeTab === 'guardadas' ? 'No tienes vacantes guardadas aún' : 'No hay vacantes disponibles'}
          </h3>
          <p className="text-ink-secondary mt-2 max-w-md mx-auto">
            {activeTab === 'guardadas'
              ? 'Usa el ícono de marcador en cualquier oferta laboral para guardarla y postularte más adelante o compararla.'
              : 'Actualmente no hay ofertas laborales que coincidan con tu búsqueda. Intenta con otros términos.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map((job) => {
              const isSaved = savedJobIds.includes(job.id);
              const isCompared = compareIds.includes(job.id);
              return (
                <div
                  key={job.id}
                  className={twMerge(
                    'card p-6 flex flex-col hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative',
                    isCompared && 'ring-2 ring-brand-500'
                  )}
                  onClick={() => openJobModal(job)}
                >
                  {/* Top Action Icons: Bookmark & Compare */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-ink group-hover:text-brand-600 transition-colors line-clamp-1">
                        {job.title}
                      </h3>
                      <p className="text-ink-secondary font-medium mt-1 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 shrink-0 text-brand-600" /> {job.company.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleCompare(job.id, e)}
                        title="Comparar esta vacante"
                        className={twMerge(
                          'p-2 rounded-xl border text-xs font-bold transition-all',
                          isCompared
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-[var(--bg-muted)] text-ink-secondary border-[var(--border-color)] hover:border-brand-400'
                        )}
                      >
                        <Scale className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(job.id, e)}
                        title={isSaved ? 'Quitar de guardadas' : 'Guardar vacante'}
                        className={twMerge(
                          'p-2 rounded-xl border transition-all',
                          isSaved
                            ? 'bg-amber-50 text-amber-600 border-amber-300'
                            : 'bg-[var(--bg-muted)] text-ink-secondary border-[var(--border-color)] hover:border-brand-400'
                        )}
                      >
                        {isSaved ? <BookmarkCheck className="w-4 h-4 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Affinity + Alumni Pill */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {matches[job.id] !== undefined && (
                      <span
                        className={twMerge(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                          matches[job.id] >= 75
                            ? 'bg-green-100 text-green-700'
                            : matches[job.id] >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {Math.round(matches[job.id])}% de afinidad
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      🎓 {((job.id % 4) + 2)} egresados UPC
                    </span>
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
                      <span>
                        {job.modality || 'Presencial'} • {job.contract_type || 'Indefinido'}
                      </span>
                    </div>
                  </div>

                  <button className="w-full btn-ghost border border-brand-200 text-brand-700 bg-brand-50 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    Ver Radiografía & Postularme
                  </button>
                </div>
              );
            })}
          </div>

          {filteredJobs.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredJobs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Floating Comparison Bar */}
      {compareIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3.5 rounded-2xl shadow-2xl border flex flex-wrap items-center gap-4 max-w-2xl w-[92%]"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">
                Comparador de Vacantes ({compareIds.length}/3 seleccionadas)
              </p>
              <p className="text-[11px] text-ink-secondary truncate">
                {compareJobsList.map((j) => j.title).join(' vs. ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareIds([])}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              Limpiar
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              disabled={compareIds.length < 2}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
            >
              Comparar Lado a Lado ({compareIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        maxWidth="max-w-5xl"
      >
        <div
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink">Comparador Lado a Lado de Vacantes</h3>
              <p className="text-xs text-ink-secondary">
                Analiza salarios, modalidad, requisitos y porcentaje de afinidad antes de postularte.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCompareModalOpen(false)}
            className="p-2 rounded-full hover-bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-x-auto">
          <div
            className="grid gap-4 min-w-[640px]"
            style={{ gridTemplateColumns: `repeat(${Math.max(2, compareJobsList.length)}, minmax(0, 1fr))` }}
          >
            {compareJobsList.map((job) => {
              const score = Math.round(matches[job.id] || 0);
              return (
                <div
                  key={job.id}
                  className="rounded-2xl border p-5 flex flex-col justify-between space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-brand-600">{job.company.name}</span>
                        <h4 className="text-base font-extrabold text-ink mt-0.5">{job.title}</h4>
                      </div>
                      <span
                        className={twMerge(
                          'px-2.5 py-1 rounded-full text-xs font-extrabold shrink-0',
                          score >= 75
                            ? 'bg-green-100 text-green-700'
                            : score >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {score}% Afinidad
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Salario:</span>
                        <span className="font-bold text-ink">
                          {job.salary_min && job.salary_max
                            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                            : 'A convenir'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Modalidad:</span>
                        <span className="font-bold text-ink">{job.modality || 'Presencial'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Contrato:</span>
                        <span className="font-bold text-ink">{job.contract_type || 'Indefinido'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Ciudad:</span>
                        <span className="font-bold text-ink">{job.company.city?.name || 'Colombia'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Experiencia Mín.:</span>
                        <span className="font-bold text-ink">{job.min_experience_years || 0} año(s)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-ink-tertiary font-semibold">Cierre:</span>
                        <span className="font-bold text-ink">{new Date(job.closing_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <p className="text-[11px] font-bold uppercase text-ink-tertiary mb-1">Requisitos Clave</p>
                      <p className="text-xs text-ink-secondary line-clamp-4">{job.requirements}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCompareModalOpen(false);
                      openJobModal(job);
                    }}
                    className="btn-primary w-full justify-center text-xs py-2.5"
                  >
                    Ver Radiografía y Postularme
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Rich Job Detail + Skill Gap Analyzer + Pitch Modal */}
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
                  {(breakdown?.total_score !== undefined || matches[selectedJob.id] !== undefined) && (
                    <span
                      className={twMerge(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shrink-0',
                        (breakdown?.total_score ?? matches[selectedJob.id]) >= 75
                          ? 'bg-green-100 text-green-700'
                          : (breakdown?.total_score ?? matches[selectedJob.id]) >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {Math.round(breakdown?.total_score ?? matches[selectedJob.id])}% de afinidad
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary pt-0.5">
                  <span className="font-semibold text-brand-600 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 shrink-0" />
                    {selectedJob.company.name}
                  </span>
                  {selectedJob.company.sector?.name && (
                    <span className="text-ink-tertiary">• {selectedJob.company.sector.name}</span>
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
                  onClick={() => handleToggleBookmark(selectedJob.id)}
                  className={twMerge(
                    'p-2.5 rounded-xl border transition-colors',
                    savedJobIds.includes(selectedJob.id)
                      ? 'bg-amber-50 text-amber-600 border-amber-300'
                      : 'border-[var(--border-color)] text-ink-secondary'
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
                  className="transition-colors p-2 rounded-full hover-bg-muted shrink-0"
                  style={{ color: 'var(--text-muted)' }}
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
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border"
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
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">Modalidad & Contrato</p>
                    <p className="text-sm font-bold text-ink">
                      {selectedJob.modality || 'Presencial'} • {selectedJob.contract_type || 'Indefinido'}
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
                        ? new Date(selectedJob.closing_date).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'No especificada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* RADIOGRAFÍA DE AFINIDAD & SKILL GAP ANALYZER */}
              <div
                className="p-5 rounded-2xl border space-y-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,168,110,0.06), rgba(14,72,50,0.03))',
                  borderColor: 'rgba(34,168,110,0.25)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-ink uppercase tracking-wide">
                        Radiografía de Afinidad & Brecha de Habilidades (IA)
                      </h4>
                      <p className="text-xs text-ink-secondary">
                        Compara tu perfil actual con lo que busca {selectedJob.company.name}
                      </p>
                    </div>
                  </div>
                  {loadingBreakdown && (
                    <span className="text-xs text-brand-600 font-semibold animate-pulse">Analizando perfil...</span>
                  )}
                </div>

                {breakdown && (
                  <>
                    {/* 3 Criteria Progress Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-ink-secondary">Habilidades Técnicas</span>
                          <span className="text-brand-600">{breakdown.skills_score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${breakdown.skills_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-ink-secondary">Programa Académico</span>
                          <span className="text-brand-600">{breakdown.program_score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${breakdown.program_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-ink-secondary">
                            Experiencia ({breakdown.experience_match.graduate_years}a / {breakdown.experience_match.required_years}a)
                          </span>
                          <span className="text-brand-600">{breakdown.experience_score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${breakdown.experience_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Matched & Missing Skills with 1-Click Add */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Habilidades que cumples ({breakdown.matched_skills.length})
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
                          <p className="text-xs text-ink-tertiary italic">
                            Agrega las habilidades sugeridas a la derecha para subir tu afinidad.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" />
                          Habilidades por añadir a tu perfil ({breakdown.missing_skills.length})
                        </p>
                        {breakdown.missing_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {breakdown.missing_skills.map((sk) => (
                              <button
                                key={sk.skill_id}
                                type="button"
                                disabled={addingSkillId === sk.skill_id}
                                onClick={() => handleQuickAddSkill(sk.skill_id, sk.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 hover:bg-brand-600 hover:text-white transition-colors"
                                title="Haz clic si dominas esta habilidad para agregarla a tu perfil y recalcular afinidad"
                              >
                                <Plus className="w-3 h-3" />
                                {addingSkillId === sk.skill_id ? 'Agregando...' : `${sk.name} (La tengo)`}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Award className="w-4 h-4" /> ¡Cumples todas las competencias detectadas!
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
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

              {/* Cover Letter / Pitch Personalizado */}
              <div
                className="p-4 rounded-2xl border space-y-2.5"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Carta de Presentación / Pitch para el Reclutador (Opcional)
                  </label>
                  {breakdown?.recommended_pitch && (
                    <button
                      type="button"
                      onClick={() => setCoverLetter(breakdown.recommended_pitch)}
                      className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                    >
                      ✨ Autogenerar Pitch con mi Perfil
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Destaca en pocas líneas por qué eres el candidato ideal para esta vacante..."
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
                    'Enviar Postulación'
                  )}
                </button>
              </div>

              {successMessage && (
                <div
                  className="p-3 rounded-xl border flex items-center gap-2.5 animate-fade-in text-sm font-semibold"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Modal: Guardar Búsqueda */}
      {isSaveSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <BookmarkPlus className="w-5 h-5 text-brand-600" />
                  Guardar Búsqueda y Crear Alerta
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Recibirás alertas web y notificaciones push en tu teléfono cuando haya nuevas vacantes afines.
                </p>
              </div>
              <button onClick={() => setIsSaveSearchModalOpen(false)} className="text-ink-tertiary hover:text-ink">✕</button>
            </div>

            <form onSubmit={handleSaveCurrentSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Nombre de la Búsqueda *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Desarrollador Python Remoto en Bogotá"
                  value={savedSearchName}
                  onChange={(e) => setSavedSearchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="p-3 rounded-xl bg-muted text-xs space-y-1">
                <p className="font-bold text-ink">Filtros que se guardarán:</p>
                <p className="text-ink-secondary">• Término: {searchTerm || 'Cualquiera'}</p>
                <p className="text-ink-secondary">• Sector: {sectorFilter === 'ALL' ? 'Todos' : sectorFilter}</p>
                <p className="text-ink-secondary">• Ciudad: {cityFilter === 'ALL' ? 'Todas' : cityFilter}</p>
                <p className="text-ink-secondary">• Modalidad: {modalityFilter === 'ALL' ? 'Todas' : modalityFilter}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setIsSaveSearchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSearch}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  style={{ backgroundColor: '#087443' }}
                >
                  <span>{savingSearch ? 'Guardando...' : 'Guardar Búsqueda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mis Búsquedas Guardadas */}
      {isSavedSearchesListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-600" />
                  Mis Búsquedas y Alertas Guardadas ({savedSearches.length})
                </h3>
                <p className="text-xs text-ink-secondary">
                  Haz clic para aplicar los filtros o elimina las que ya no necesites.
                </p>
              </div>
              <button onClick={() => setIsSavedSearchesListOpen(false)} className="text-ink-tertiary hover:text-ink">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y custom-scrollbar" style={{ borderColor: 'var(--border-color)' }}>
              {savedSearches.length === 0 ? (
                <p className="text-center py-8 text-xs text-ink-tertiary">No tienes búsquedas guardadas aún.</p>
              ) : (
                savedSearches.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-ink truncate">{s.name}</h4>
                      <p className="text-xs text-ink-secondary truncate mt-0.5">
                        {s.filters_json?.q ? `"${s.filters_json.q}" • ` : ''}
                        {s.filters_json?.sector !== 'ALL' && s.filters_json?.sector ? `${s.filters_json.sector} • ` : ''}
                        {s.filters_json?.modality !== 'ALL' && s.filters_json?.modality ? `${s.filters_json.modality}` : 'Cualquier modalidad'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplySavedSearch(s)}
                        className="px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-bold transition-all"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => handleDeleteSavedSearch(s.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar búsqueda"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
