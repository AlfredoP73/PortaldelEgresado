import { useState, useEffect } from 'react';
import { graduatesApi } from '../../../api';
import { Building2, CheckCircle2, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';

interface JobOffer {
  id: number;
  title: string;
  company: {
    name: string;
  };
}

interface Application {
  id: number;
  job_offer_id: number;
  graduate_id: number;
  application_date: string;
  status: string;
  job_offer?: JobOffer;
}

export default function GraduateApplications() {
    const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{'Mis Postulaciones'}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{'Consulta el estado de tus postulaciones.'}</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden mb-6">
            <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
                  <input
                    type="text"
                    placeholder={'Buscar por cargo o empresa...'}
                    className="input w-full pl-9"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div className="w-full md:w-auto">
                  <select 
                    className="input w-full sm:w-48" 
                    value={statusFilter} 
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="ALL">{'Todos los Estados'}</option>
                    <option value="POSTULADO">{'Postulado'}</option>
                    <option value="EN_EVALUACION">{'En Evaluación'}</option>
                    <option value="CONTRATADO">{'Contratado'}</option>
                    <option value="RECHAZADO">{'Rechazado'}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {(() => {
            const filteredApps = applications.filter(app => {
              const matchSearch = (app.job_offer?.title.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                                  (app.job_offer?.company.name.toLowerCase() || '').includes(searchTerm.toLowerCase());
              const matchStatus = statusFilter === 'ALL' || app.status.toUpperCase() === statusFilter;
              return matchSearch && matchStatus;
            });

            const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

            if (filteredApps.length === 0) {
              return (
                <div className="card p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-ink">{'No hay postulaciones'}</h3>
                  <p className="text-ink-secondary mt-2 max-w-md mx-auto">{'No hay postulaciones'}</p>
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedApps.map(app => (
            <div key={app.id} className="card p-6 flex flex-col hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink line-clamp-1">{app.job_offer?.title}</h3>
                  <p className="text-ink-secondary font-medium mt-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {app.job_offer?.company.name}
                  </p>
                </div>
                <span className={twMerge("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", 
                  app.status.toUpperCase() === 'POSTULADO' ? "bg-blue-50 text-blue-600 border border-blue-200" :
                  app.status.toUpperCase() === 'EN_EVALUACION' ? "bg-yellow-50 text-yellow-600 border border-yellow-200" :
                  app.status.toUpperCase() === 'CONTRATADO' ? "bg-green-50 text-green-600 border border-green-200" :
                  "bg-red-50 text-red-600 border border-red-200"
                )}>
                  {app.status}
                </span>
              </div>
              <div className="text-sm text-ink-tertiary mt-2">
                {'Postulado'}: {new Date(app.application_date).toLocaleDateString()}
              </div>
            </div>
                  ))}
                </div>
                {filteredApps.length > pageSize && (
                  <div className="mt-6">
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
        </>
      )}
    </div>
  );
}
