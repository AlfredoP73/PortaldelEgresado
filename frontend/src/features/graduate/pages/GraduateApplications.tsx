import { useState, useEffect } from 'react';
import { graduatesApi } from '../../../api';
import { Building2, CheckCircle2, Search, MoreVertical, LayoutList, Briefcase, MapPin, Calendar, Users, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import ProgressRing from '../../../components/ProgressRing';
import ApplicationDetail from '../components/ApplicationDetail';

interface JobOffer {
  id: number;
  title: string;
  applicants_count?: number;
  company: {
    name: string;
    location?: string;
  };
}

interface Application {
  id: number;
  job_offer_id: number;
  graduate_id: number;
  application_date: string;
  status: string;
  job_offer?: JobOffer;
  sub_processes?: any[];
}

const FILTER_PILLS = [
  { id: 'ALL', label: 'Todas' },
  { id: 'POSTULADO', label: 'Aplicado' },
  { id: 'EN_EVALUACION', label: 'HdV Vista' },
  { id: 'ENTREVISTADO', label: 'En proceso' },
  { id: 'FINAL', label: 'Finalizado' },
];

export default function GraduateApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for Navigation
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await graduatesApi.get('/my-applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressData = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'POSTULADO') return { progress: 25, label: 'Postulado', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeRing: 'ring-emerald-600/20', stroke: 'var(--brand-500, #10b981)' };
    if (s === 'EN_EVALUACION') return { progress: 50, label: 'HdV Vista', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700', badgeRing: 'ring-blue-600/20', stroke: '#3b82f6' };
    if (s === 'ENTREVISTADO') return { progress: 75, label: 'En proceso', badgeBg: 'bg-violet-50', badgeText: 'text-violet-700', badgeRing: 'ring-violet-600/20', stroke: '#8b5cf6' };
    if (s === 'CONTRATADO') return { progress: 100, label: 'Contratado', badgeBg: 'bg-green-50', badgeText: 'text-green-700', badgeRing: 'ring-green-600/20', stroke: '#22c55e' };
    if (s === 'RECHAZADO') return { progress: 100, label: 'Proceso Finalizado', badgeBg: 'bg-slate-100', badgeText: 'text-slate-600', badgeRing: 'ring-slate-500/20', color: 'text-slate-500', stroke: '#94a3b8' };
    return { progress: 0, label: 'Desconocido', badgeBg: 'bg-slate-50', badgeText: 'text-slate-600', badgeRing: 'ring-slate-500/20', stroke: '#cbd5e1' };
  };

  // ----------------------------------------------------
  // DETAIL VIEW
  // ----------------------------------------------------
  if (selectedAppId) {
    const selectedApp = applications.find(a => a.id === selectedAppId);
    if (selectedApp) {
      return (
        <div className="animate-fade-in-up">
          <ApplicationDetail 
            application={selectedApp} 
            onBack={() => setSelectedAppId(null)} 
            onUpdate={fetchApplications} 
          />
        </div>
      );
    }
  }

  // ----------------------------------------------------
  // LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto px-4 xl:px-8 animate-fade-in-up">
      {/* Header section with gradient typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-brand-500">
            Mis Postulaciones
          </h2>
          <p className="mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Haz seguimiento en tiempo real al estado de tus procesos de selección.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cargo o empresa..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-10 pr-3 py-2.5 rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-shadow shadow-sm hover:shadow-md"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-y-2 border-brand-600"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 bg-brand-100 rounded-full animate-pulse"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Pills Filter - Premium Style */}
          <div className="flex flex-wrap items-center gap-3 p-2 rounded-2xl shadow-sm w-fit" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            {FILTER_PILLS.map(pill => (
              <button
                key={pill.id}
                onClick={() => { setStatusFilter(pill.id); setCurrentPage(1); }}
                className={twMerge(
                  "px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  statusFilter === pill.id 
                    ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transform scale-[1.02]" 
                    : "bg-transparent hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Main List */}
            <div className="flex-1 space-y-5">
              {(() => {
                const filteredApps = applications.filter(app => {
                  const matchSearch = (app.job_offer?.title.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                                      (app.job_offer?.company.name.toLowerCase() || '').includes(searchTerm.toLowerCase());
                  
                  if (statusFilter === 'ALL') return matchSearch;
                  if (statusFilter === 'FINAL') return matchSearch && (app.status.toUpperCase() === 'CONTRATADO' || app.status.toUpperCase() === 'RECHAZADO');
                  return matchSearch && app.status.toUpperCase() === statusFilter;
                });

                const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                if (filteredApps.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 px-4 backdrop-blur-sm border-dashed rounded-3xl text-center" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-color)' }}>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--bg-muted)' }}>
                        <LayoutList className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>No hay postulaciones aquí</h3>
                      <p className="max-w-md" style={{ color: 'var(--text-secondary)' }}>No hemos encontrado ninguna candidatura que coincida con tus filtros actuales. Intenta buscando algo diferente.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {paginatedApps.map((app, index) => {
                      const { progress, label, badgeBg, badgeText, badgeRing, stroke } = getProgressData(app.status);
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => setSelectedAppId(app.id)}
                          style={{ animationDelay: `${index * 50}ms`, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                          className="group relative rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-brand-300 transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in-up"
                        >
                          {/* Decorative gradient blob on hover */}
                          <div className="absolute -right-20 -top-20 w-40 h-40 bg-brand-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                          <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                            {/* Left: Job Info */}
                            <div className="flex-1 space-y-4">
                              <div>
                                <h3 className="text-xl font-bold group-hover:text-brand-600 transition-colors line-clamp-1 pr-4" style={{ color: 'var(--text-main)' }}>
                                  {app.job_offer?.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  <Building2 className="w-4 h-4 text-brand-500" />
                                  <span>{app.job_offer?.company.name}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                  {app.job_offer?.company.location || 'Colombia'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                  {new Date(app.application_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                  {app.job_offer?.applicants_count || 1} {app.job_offer?.applicants_count === 1 ? 'candidato' : 'candidatos'}
                                </div>
                              </div>
                            </div>

                            {/* Right: Progress Donut & Status */}
                            <div className="flex items-center gap-5 p-4 rounded-xl transition-colors" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                              <ProgressRing progress={progress} size={64} strokeWidth={6} color={stroke} />
                              <div className="min-w-[120px]">
                                <span className={twMerge("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset mb-1.5", badgeBg, badgeText, badgeRing)}>
                                  {label}
                                </span>
                                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                  Estado actual
                                </p>
                              </div>
                              <div className="hidden md:flex ml-2 w-8 h-8 items-center justify-center rounded-full shadow-sm group-hover:text-brand-600 group-hover:border-brand-200 transition-all transform group-hover:translate-x-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <ChevronRight className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredApps.length > pageSize && (
                      <div className="mt-8">
                        <Pagination 
                          currentPage={currentPage}
                          totalItems={filteredApps.length}
                          pageSize={pageSize}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Right Panel: Explanatory Box (Like Image 1) */}
            <div className="hidden xl:block w-[340px] flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="p-8 rounded-3xl shadow-sm sticky top-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Briefcase className="w-5 h-5 text-brand-500" />
                  Ruta de Selección
                </h3>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  
                  {/* Timeline Item 1 */}
                  <div className="relative flex items-center group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 bg-emerald-100 text-emerald-600 shadow shrink-0 z-10" style={{ borderColor: 'var(--bg-surface)' }}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="ml-4 flex-1 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:border-brand-200" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold" style={{ color: 'var(--text-main)' }}>Postulado</div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tu hoja de vida fue enviada a la empresa exitosamente.</div>
                    </div>
                  </div>

                  {/* Timeline Item 2 */}
                  <div className="relative flex items-center group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 bg-blue-50 text-blue-400 shadow shrink-0 z-10" style={{ borderColor: 'var(--bg-surface)' }}>
                      <div className="w-3 h-3 bg-current rounded-full" />
                    </div>
                    <div className="ml-4 flex-1 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:border-blue-200" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold" style={{ color: 'var(--text-main)' }}>HdV Vista</div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>El reclutador está analizando tu perfil.</div>
                    </div>
                  </div>

                  {/* Timeline Item 3 */}
                  <div className="relative flex items-center group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 bg-violet-50 text-violet-400 shadow shrink-0 z-10" style={{ borderColor: 'var(--bg-surface)' }}>
                      <div className="w-3 h-3 bg-current rounded-full" />
                    </div>
                    <div className="ml-4 flex-1 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:border-violet-200" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold" style={{ color: 'var(--text-main)' }}>En proceso</div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Estás en etapas de evaluación o entrevista.</div>
                    </div>
                  </div>

                </div>

                <div className="mt-8 p-4 bg-brand-50/50 rounded-xl border border-brand-100">
                  <p className="text-xs text-brand-700 leading-relaxed">
                    <strong>Tip:</strong> Revisa tu buzón de notificaciones frecuentemente. Las empresas pueden enviarte pruebas técnicas y enlaces a entrevistas.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

