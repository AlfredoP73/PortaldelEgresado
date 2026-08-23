import { useState, useEffect, useMemo } from 'react';
import api from '../../../api';
import { Briefcase, ChevronDown, User, Calendar, AlertCircle, Search, MoreVertical } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import CandidateDetailsModal from '../../graduate/components/CandidateDetailsModal';
import { useTranslation } from '../../../context/LanguageContext';

interface JobOffer {
  id: number;
  title: string;
}

interface Application {
  id: number;
  job_offer_id: number;
  candidate_id: number;
  status: string;
  application_date: string;
  graduate?: {
    first_name: string;
    last_name: string;
    program_id: number;
    graduation_year: number;
  };
}

const getKanbanColumns = (t: (key: string) => string) => [
  { id: 'POSTULADO', title: t('kanban.col_applied'), dotColor: 'bg-slate-400' },
  { id: 'EN_EVALUACION', title: t('kanban.col_evaluating'), dotColor: 'bg-yellow-400' },
  { id: 'ENTREVISTADO', title: t('kanban.col_interviewed'), dotColor: 'bg-blue-400' },
  { id: 'CONTRATADO', title: t('kanban.col_hired'), dotColor: 'bg-brand-400' },
  { id: 'RECHAZADO', title: t('kanban.col_rejected'), dotColor: 'bg-red-400' },
];

export default function Kanban() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();
  const KANBAN_COLUMNS = getKanbanColumns(t);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isAdmin = user?.role_name === 'ADMIN';

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob !== null) {
      fetchApplications(selectedJob);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data);
      if (response.data.length > 0) {
        setSelectedJob(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchApplications = async (jobId: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/applications/job/${jobId}`);
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const moveApplication = async (appId: number, newStatus: string) => {
    if (isAdmin) return;
    try {
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      await api.put(`/applications/${appId}/status`, { status: newStatus });
      if (selectedJob) fetchApplications(selectedJob);
    } catch (error) {
      console.error('Error updating application status:', error);
      if (selectedJob) fetchApplications(selectedJob);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, appId: number) => {
    if (isAdmin) return;
    setDraggingAppId(appId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appId.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, statusId: string) => {
    if (isAdmin) return;
    e.preventDefault();
    const appIdStr = e.dataTransfer.getData('text/plain');
    if (!appIdStr) return;
    const appId = parseInt(appIdStr, 10);
    setDraggingAppId(null);
    if (!isNaN(appId)) {
      moveApplication(appId, statusId);
    }
  };

  const filteredApplications = useMemo(() => {
    if (!searchTerm) return applications;
    return applications.filter(app => {
      const name = app.graduate ? `${app.graduate.first_name} ${app.graduate.last_name}`.toLowerCase() : `candidato #${app.candidate_id}`;
      return name.includes(searchTerm.toLowerCase());
    });
  }, [applications, searchTerm]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="page-title">{t('kanban.title')}</h2>
          <p className="text-sm mt-1 text-ink-secondary">{t('kanban.subtitle')}</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-ink-tertiary" />
            </div>
            <input
              type="text"
              placeholder={t('kanban.search')}
              className="input pl-10 bg-white w-full shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[240px] w-full md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Briefcase className="h-5 w-5 text-brand-500" />
            </div>
            <select
              className="input appearance-none font-medium text-ink bg-white shadow-sm cursor-pointer w-full"
              style={{ paddingLeft: '2.5rem' }}
              value={selectedJob || ''}
              onChange={(e) => setSelectedJob(Number(e.target.value))}
            >
              <option value="" disabled>Selecciona una vacante...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-ink-tertiary" />
            </div>
          </div>
        </div>
      </div>

      {!selectedJob ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 card flex flex-col items-center justify-center p-12 text-center"
        >
          <AlertCircle className="w-16 h-16 text-brand-200 mb-4" />
          <h3 className="text-xl font-bold text-ink mb-2">No has seleccionado ninguna vacante</h3>
          <p className="text-ink-secondary">Crea una vacante o selecciona una del menú para ver sus candidatos.</p>
        </motion.div>
      ) : loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max">
            {KANBAN_COLUMNS.map((col, index) => {
              const columnApps = filteredApplications.filter(a => a.status.toUpperCase() === col.id);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                  key={col.id} 
                  className={twMerge("w-80 rounded-[12px] flex flex-col overflow-hidden transition-colors border shadow-sm", !isAdmin && draggingAppId ? "border-dashed border-brand-500 bg-brand-50/50" : "border-[var(--border-color)] bg-[var(--bg-muted)]")}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${col.dotColor}`} />
                      <h3 className="font-semibold text-ink tracking-wide text-sm uppercase">{col.title}</h3>
                    </div>
                    <span className="flex items-center justify-center bg-[var(--bg-muted)] text-ink-secondary w-7 h-7 rounded-full text-xs font-bold border border-[var(--border-color)]">
                      {columnApps.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar relative">
                    <AnimatePresence>
                      {columnApps.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center p-8 text-ink-tertiary"
                        >
                          <User className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-sm font-semibold">{t('kanban.no_candidates')}</p>
                        </motion.div>
                      ) : (
                        columnApps.map((app) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            whileHover={{ y: -2 }}
                            key={app.id} 
                            draggable={!isAdmin}
                            onDragStart={(e: any) => handleDragStart(e, app.id)}
                            onDragEnd={() => setDraggingAppId(null)}
                            onClick={() => setSelectedApplicationId(app.id)}
                            className={twMerge(
                              "card p-4 hover:shadow-lg transition-all cursor-pointer group relative border border-[var(--border-color)] bg-white", 
                              draggingAppId === app.id ? "opacity-50 border-brand-500 scale-95 shadow-none" : ""
                            )}
                          >
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="p-1 hover:bg-slate-100 rounded-md text-ink-tertiary hover:text-ink" onClick={(e) => { e.stopPropagation(); setSelectedApplicationId(app.id); }}>
                                 <MoreVertical className="w-4 h-4" />
                               </button>
                            </div>
                            <div className="flex items-start gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-brand-600 font-bold shrink-0 border border-brand-100 shadow-sm">
                                {app.graduate ? `${app.graduate.first_name.charAt(0)}${app.graduate.last_name.charAt(0)}` : <User className="w-5 h-5" />}
                              </div>
                              <div className="pr-5">
                                <h4 className="font-bold text-ink text-sm leading-tight">
                                  {app.graduate ? `${app.graduate.first_name} ${app.graduate.last_name}` : `Candidato #${app.candidate_id}`}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-ink-tertiary mt-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{app.application_date ? new Date(app.application_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">{t('kanban.view_profile')}</span>
                              {!isAdmin && <span className="text-[10px] text-ink-tertiary uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Arrastrar</span>}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedApplicationId && (
          <CandidateDetailsModal 
            applicationId={selectedApplicationId} 
            onClose={() => setSelectedApplicationId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
