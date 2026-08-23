import { useState, useEffect } from 'react';
import { graduatesApi } from '../../../api';
import { FileText, Building2, UserCircle, Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';

interface Application {
  id: number;
  job_offer_id: number;
  graduate_id: number;
  application_date: string;
  status: string;
  job_offer?: {
    title: string;
    company: { name: string };
  };
}

export default function AdminApplications() {
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
      const res = await graduatesApi.get('/admin/applications');
      setApplications(res.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{'Reporte Global de Postulaciones'}</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{'Todas las postulaciones de todos los egresados a nivel del sistema.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-ink">No hay postulaciones registradas</h3>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
                <input
                  type="text"
                  placeholder={'Buscar por vacante o empresa...'}
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
                  <option value="POSTULADO">{'POSTULADO'}</option>
                  <option value="EN_EVALUACION">En Evaluación</option>
                  <option value="CONTRATADO">{'CONTRATADO'}</option>
                  <option value="RECHAZADO">{'RECHAZADO'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Vacante / Empresa'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'ID Egresado'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{'Fecha'}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider text-right">{'Estado'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
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
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-ink-secondary italic">
                          No se encontraron postulaciones con los filtros actuales.
                        </td>
                      </tr>
                    );
                  }

                  return paginatedApps.map(app => (
                  <tr key={app.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-ink">{app.job_offer?.title}</p>
                      <p className="text-xs text-ink-secondary flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {app.job_offer?.company.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 font-semibold text-ink"><UserCircle className="w-4 h-4 text-ink-secondary" /> {app.graduate_id}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-ink">{new Date(app.application_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={twMerge("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block", 
                        app.status.toUpperCase() === 'POSTULADO' ? "bg-blue-50 text-blue-600 border border-blue-200" :
                        app.status.toUpperCase() === 'EN_EVALUACION' ? "bg-yellow-50 text-yellow-600 border border-yellow-200" :
                        app.status.toUpperCase() === 'CONTRATADO' ? "bg-green-50 text-green-600 border border-green-200" :
                        "bg-red-50 text-red-600 border border-red-200"
                      )}>
                        {app.status.toUpperCase() === 'POSTULADO' ? 'POSTULADO' :
                         app.status.toUpperCase() === 'EN_EVALUACION' ? 'En Evaluación' :
                         app.status.toUpperCase() === 'CONTRATADO' ? 'CONTRATADO' :
                         app.status.toUpperCase() === 'ENTREVISTADO' ? 'ENTREVISTADO' :
                         'RECHAZADO'}
                      </span>
                    </td>
                  </tr>
                ));
                })()}
              </tbody>
            </table>
          </div>
          {applications.length > pageSize && (
            <Pagination 
              currentPage={currentPage}
              totalItems={applications.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
