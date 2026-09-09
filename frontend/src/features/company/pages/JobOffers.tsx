import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import api from '../../../api';
import { Plus, Briefcase, Calendar, DollarSign, X, CheckCircle2, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Modal from '../../../components/Modal';

interface JobOffer {
  id: number;
  title: string;
  description?: string;
  requirements?: string;
  functions?: string;
  company: { 
    name: string;
    sector?: { name: string };
    city?: { name: string };
  };
  salary_min: number;
  salary_max: number;
  status: string;
  closing_date: string;
}

export default function JobOffers() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [programs, setPrograms] = useState<{id: number, name: string}[]>([]);
  const [availableSkills, setAvailableSkills] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  
  // New state for form
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
    
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isAdmin = user?.role_name === 'ADMIN';

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const [jobsRes, progRes, skillsRes] = await Promise.all([
        api.get('/jobs'),
        api.get('/programs').catch(() => ({ data: [] })),
        fetch(import.meta.env.VITE_GRADUATES_URL ? `${import.meta.env.VITE_GRADUATES_URL}/api/modulo1/skills` : 'http://localhost:8003/api/modulo1/skills').then(r => r.json()).catch(() => [])
      ]);
      setJobs(jobsRes.data);
      setPrograms(progRes.data);
      setAvailableSkills(skillsRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/jobs', {
        company_id: user?.id,
        title: formData.get('title'),
        description: formData.get('description'),
        requirements: formData.get('requirements'),
        functions: formData.get('functions'),
        salary_min: Number(formData.get('salary_min')) || null,
        salary_max: Number(formData.get('salary_max')) || null,
        min_experience_years: Number(formData.get('min_experience_years')) || 0,
        program_id: Number(formData.get('program_id')),
        closing_date: formData.get('closing_date'),
        available_slots: Number(formData.get('available_slots')) || 1,
        required_skills: selectedSkills.map(id => ({ skill_id: id, required_level: "Intermedio" }))
      });
      setIsModalOpen(false);
      setSelectedSkills([]);
      fetchJobs();
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error(error.response?.data?.detail || 'Error al publicar la vacante. Asegúrate de haber completado tu perfil de empresa primero.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-heading text-ink tracking-tight">
            {isAdmin ? 'Explorar Vacantes' : 'Mis Ofertas Laborales'}
          </h2>
          <p className="text-ink-secondary mt-1">
            {isAdmin ? 'Visualiza las ofertas de todas las empresas aliadas.' : 'Gestiona y publica nuevas oportunidades laborales.'}
          </p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" /> Publicar Vacante
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 bg-[var(--bg-surface)]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
              <input
                type="text"
                placeholder={'Buscar por título de vacante...'}
                className="input w-full pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <select 
                className="input w-full sm:w-40" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">{'Todos los Estados'}</option>
                <option value="ACTIVE">{'ACTIVA'}</option>
                <option value="CLOSED">{'CERRADA'}</option>
              </select>
              
              <div className="relative w-full sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-ink-secondary" />
                </div>
                <input
                  type="number"
                  placeholder={'Salario'}
                  className="input w-full pl-9"
                  value={minSalaryFilter}
                  onChange={(e) => setMinSalaryFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
        {(() => {
          const filteredJobs = jobs.filter(job => {
            const matchSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || job.status.toUpperCase() === statusFilter;
            const matchSalary = minSalaryFilter ? (job.salary_min && job.salary_min >= Number(minSalaryFilter)) : true;
            return matchSearch && matchStatus && matchSalary;
          });

          if (filteredJobs.length === 0) {
            return (
              <div className="col-span-full card p-12 flex flex-col items-center justify-center text-center">
                <Briefcase className="w-16 h-16 text-brand-200 mb-4" />
                <h3 className="text-xl font-bold text-ink mb-2">No hay vacantes</h3>
                <p className="text-ink-secondary">
                  {isAdmin ? 'No se encontraron vacantes con los filtros actuales.' : 'Aún no has publicado ninguna oportunidad o no coinciden con los filtros.'}
                </p>
              </div>
            );
          }

          return filteredJobs.map((job) => (
            <div key={job.id} className="card p-6 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand-100 to-transparent opacity-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
              
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="absolute top-4 right-4">
                  <span className={twMerge("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", 
                    job.status.toUpperCase() === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                  )}>
                    {job.status.toUpperCase() === 'ACTIVE' ? 'ACTIVA' : 'CERRADA'}
                  </span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-ink mb-1 group-hover:text-brand-600 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-ink-secondary font-medium text-sm mb-6 flex-1 line-clamp-1">
                {job.company?.name || 'Empresa Confidencial'}
              </p>
              
              <div className="space-y-3 text-sm text-ink-secondary mb-6 bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-brand-500" />
                  <span className="font-medium text-ink">
                    ${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  <span>{'Cierre'}: <strong className="text-ink">{new Date(job.closing_date).toLocaleDateString()}</strong></span>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedJob(job)}
                className="w-full py-2.5 bg-transparent border border-[var(--border-color)] hover:border-brand-500 hover:text-brand-600 text-ink-secondary rounded-xl font-semibold transition-all duration-200 shadow-sm"
              >
                {'Ver Detalles'}
              </button>
            </div>
          ));
        })()}
      </div>

      {/* Modal Detalles */}
      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} maxWidth="max-w-4xl">
        {selectedJob && (
          <>
            <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <h3 className="text-2xl font-bold text-ink font-heading">{selectedJob.title}</h3>
              <button onClick={() => setSelectedJob(null)} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-ink text-lg">{selectedJob.company?.name || 'Empresa Confidencial'}</h4>
                <p className="text-brand-600 font-medium text-sm">
                  {selectedJob.company?.sector?.name || 'Sector no especificado'} • {selectedJob.company?.city?.name || 'Ubicación no especificada'}
                </p>
              </div>
              {selectedJob.description && (
                <div>
                  <h4 className="font-bold text-ink mb-2 text-lg">Descripción</h4>
                  <p className="text-ink-secondary whitespace-pre-line leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{selectedJob.description}</p>
                </div>
              )}
              {selectedJob.requirements && (
                <div>
                  <h4 className="font-bold text-ink mb-2 text-lg">Requisitos</h4>
                  <p className="text-ink-secondary whitespace-pre-line leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{selectedJob.requirements}</p>
                </div>
              )}
              {selectedJob.functions && (
                <div>
                  <h4 className="font-bold text-ink mb-2 text-lg">Funciones</h4>
                  <p className="text-ink-secondary whitespace-pre-line leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{selectedJob.functions}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                <div>
                  <h4 className="font-bold text-ink mb-1">Salario</h4>
                  <p className="text-ink-secondary">${selectedJob.salary_min?.toLocaleString()} - ${selectedJob.salary_max?.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-bold text-ink mb-1">Fecha de Cierre</h4>
                  <p className="text-ink-secondary flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {'Cierre'}: {new Date(selectedJob.closing_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 shrink-0 border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <button onClick={() => setSelectedJob(null)} className="w-full btn-primary">
                Cerrar Detalles
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Creación */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="max-w-3xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="text-xl font-bold text-ink font-heading">Publicar Nueva Vacante</h3>
          <button onClick={() => setIsModalOpen(false)} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleCreateJob} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Título de la Vacante</label>
            <input name="title" type="text" className="input" placeholder="Ej: Desarrollador Frontend Senior" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Descripción Breve</label>
              <textarea name="description" className="input" required></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Requisitos</label>
              <textarea name="requirements" className="input" required></textarea>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Funciones del Cargo</label>
            <textarea name="functions" className="input min-h-[80px]" required></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Salario Min ($)</label>
              <input name="salary_min" type="number" className="input" placeholder="3000000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Salario Max ($)</label>
              <input name="salary_max" type="number" className="input" placeholder="5000000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Programa Académico</label>
              <select name="program_id" className="input" required>
                <option value="">Seleccione un programa...</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Fecha de Cierre</label>
              <input name="closing_date" type="date" className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Cupos Disponibles</label>
              <input name="available_slots" type="number" className="input" defaultValue={1} min="1" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Años de Exp. Mínima</label>
              <input name="min_experience_years" type="number" className="input" defaultValue={0} min="0" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Habilidades Requeridas</label>
              <div className="border border-[var(--border-color)] rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-[var(--bg-muted)]">
                {availableSkills.map(skill => (
                  <label key={skill.id} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-[var(--border-color)] text-brand-600 focus:ring-brand-500 bg-[var(--bg-main)]"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSkills([...selectedSkills, skill.id]);
                        else setSelectedSkills(selectedSkills.filter(id => id !== skill.id));
                      }}
                    />
                    <span className="text-sm text-ink">{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary">
              <CheckCircle2 className="w-5 h-5" /> Publicar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

