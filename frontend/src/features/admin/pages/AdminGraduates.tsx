import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { graduatesApi, authApi } from '../../../api';
import api from '../../../api';
import { Users, GraduationCap, Phone, ExternalLink, Plus, X, Save, Loader2, PlayCircle, Search, Download, Upload } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';
import { exportToExcel, importFromExcel } from '../../../utils/excelUtils';

const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL || 'http://localhost:8003';

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
  cv_url?: string;
  experiences?: WorkExperience[];
  academic_histories?: AcademicHistory[];
}

interface Program {
  id: number;
  name: string;
}

export default function AdminGraduates() {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGraduate, setSelectedGraduate] = useState<Graduate | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const [importing, setImporting] = useState(false);
  
  useEffect(() => {
    fetchGraduates();
    fetchPrograms();
  }, []);

  const handleExportExcel = () => {
    const dataToExport = filteredGraduates.map(g => ({
      'ID Usuario': g.user_id,
      'Nombres': g.first_name,
      'Apellidos': g.last_name,
      'ID Programa': g.program_id,
      'Año Graduación': g.graduation_year,
      'Teléfono': g.phone || 'N/A'
    }));
    exportToExcel(dataToExport, 'Egresados');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const requiredCols = ['Nombres', 'Apellidos', 'Correo', 'ID Programa', 'Año Graduación'];
      const data = await importFromExcel(file, requiredCols);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const payload = {
            first_name: row['Nombres'],
            last_name: row['Apellidos'],
            email: row['Correo'],
            password: row['Contraseña'] || 'upc12345',
            program_id: Number(row['ID Programa']),
            graduation_year: Number(row['Año Graduación']),
            phone: row['Teléfono'] || ''
          };
          await graduatesApi.post('/admin/graduates', payload);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Error importando fila:', row, err);
        }
      }

      toast.success(`Importación completa: ${successCount} exitosos, ${errorCount} errores.`);
      fetchGraduates();
    } catch (error: any) {
      toast.error(error.message || 'Error al importar Excel');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const fetchGraduates = async () => {
    try {
      setLoading(true);
      const res = await graduatesApi.get('/admin/graduates');
      setGraduates(res.data);
    } catch (error) {
      console.error('Error fetching graduates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/programs');
      setPrograms(res.data);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, any> = Object.fromEntries(fd.entries());
    data.program_id = Number(data.program_id);
    data.graduation_year = Number(data.graduation_year);

    try {
      await graduatesApi.post('/admin/graduates', data);
      setShowModal(false);
      fetchGraduates();
      toast.success('Egresado registrado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar egresado');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async (userId: number) => {
    try {
      const res = await authApi.post('/impersonate', { user_id: userId });
      const { access_token, user } = res.data;
      localStorage.setItem('adminToken', localStorage.getItem('access_token') || '');
      localStorage.setItem('adminUser', localStorage.getItem('user') || '');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      window.location.href = '/profile';
    } catch (error) {
      toast.error('Error al impersonar usuario');
    }
  };

  const filteredGraduates = graduates.filter(g => {
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase()) || (g.phone && g.phone.includes(searchTerm));
    const matchProgram = programFilter === 'ALL' || g.program_id.toString() === programFilter;
    const matchYear = yearFilter === 'ALL' || g.graduation_year.toString() === yearFilter;
    return matchSearch && matchProgram && matchYear;
  });

  const paginatedGraduates = filteredGraduates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, programFilter, yearFilter]);

  // Extraer años de graduación únicos para el filtro
  const uniqueYears = Array.from(new Set(graduates.map(g => g.graduation_year))).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="page-title">{'Directorio Global de Egresados'}</h2>
            <p className="text-sm mt-1 text-ink-secondary">{'Consulta y registra nuevos egresados en la plataforma.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleExportExcel} 
              className="btn-outline flex items-center gap-2"
              disabled={loading || graduates.length === 0}
            >
              <Download className="w-4 h-4" /> {'Exportar'}
            </button>
            <label className={`btn-outline flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importando...' : 'Importar'}
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                className="hidden" 
                onChange={handleImportExcel}
                disabled={importing}
              />
            </label>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {'Registrar Egresado'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
        </div>
      ) : graduates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-ink-tertiary)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{'No hay egresados registrados'}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-ink-secondary)' }} />
                <input
                  type="text"
                  placeholder={'Buscar por nombre o teléfono...'}
                  className="input w-full pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <select 
                  className="input w-full sm:w-64" 
                  value={programFilter} 
                  onChange={(e) => setProgramFilter(e.target.value)}
                >
                  <option value="ALL">{'Todos los Programas'}</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                  ))}
                </select>
                
                <select 
                  className="input w-full sm:w-40" 
                  value={yearFilter} 
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="ALL">{'Todos los Años'}</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{'EGRESADO'}</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{'AÑO'}</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{'CONTACTO'}</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-wider text-right" style={{ color: 'var(--text-ink-secondary)' }}>{'CV'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
                {paginatedGraduates.map((grad) => (
                  <tr key={grad.user_id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>
                          {grad.first_name.charAt(0)}{grad.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--text-main)' }}>{grad.first_name} {grad.last_name}</p>
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}><GraduationCap className="w-3 h-3" /> {'Programa ID'}: {grad.program_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--text-main)' }}>{grad.graduation_year}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-ink-secondary)' }}>
                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {grad.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleImpersonate(grad.user_id)} 
                          title="Actuar como egresado" 
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)', borderColor: 'var(--border-color)' }}
                        >
                          <PlayCircle className="w-4 h-4" /> {'Actuar Como'}
                        </button>
                        <button 
                          onClick={() => setSelectedGraduate(grad)} 
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border border-transparent"
                          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                        >
                          {'Ver Detalles'}
                        </button>
                        {grad.cv_url && (
                          <a href={`${GRADUATES_URL}${grad.cv_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border border-transparent" style={{ color: 'var(--accent-primary)' }}>
                            {'Ver PDF'} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredGraduates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-ink-secondary italic">
                      {'No se encontraron egresados con los filtros actuales.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredGraduates.length > pageSize && (
            <Pagination 
              currentPage={currentPage}
              totalItems={filteredGraduates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Modal Registrar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth="max-w-4xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="text-xl font-bold text-ink font-heading">{'Registrar Nuevo Egresado'}</h3>
          <button onClick={() => setShowModal(false)} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleRegister} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Nombres *'}</label>
              <input name="first_name" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Apellidos *'}</label>
              <input name="last_name" className="input w-full" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Correo Electrónico *'}</label>
              <input name="email" type="email" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Contraseña (Temporal) *'}</label>
              <input name="password" type="text" className="input w-full" defaultValue="upc12345" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Programa Académico *'}</label>
              <select name="program_id" className="input w-full" required>
                <option value="">{'Seleccione...'}</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Año de Graduación *'}</label>
              <input name="graduation_year" type="number" min="1980" max="2030" defaultValue={new Date().getFullYear()} className="input w-full" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">{'Teléfono'}</label>
            <input name="phone" type="text" className="input w-full" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost" disabled={saving}>{'Cancelar'}</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Detalles */}
      <Modal isOpen={!!selectedGraduate} onClose={() => setSelectedGraduate(null)} maxWidth="max-w-4xl">
        {selectedGraduate && (
          <>
            <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <h3 className="text-xl font-bold text-ink font-heading">{'Perfil del Egresado'}</h3>
                <p className="text-sm text-brand-600 font-semibold">{selectedGraduate.first_name} {selectedGraduate.last_name}</p>
              </div>
              <button onClick={() => setSelectedGraduate(null)} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {selectedGraduate.cv_url && (
                <div>
                  <h4 className="text-lg font-bold text-ink mb-3">{'Hoja de Vida (CV)'}</h4>
                  <a href={`${GRADUATES_URL}${selectedGraduate.cv_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm" style={{ backgroundColor: 'rgba(8, 116, 67, 0.1)', color: 'var(--accent-primary)' }}>
                    <ExternalLink className="w-4 h-4" /> {'Ver Hoja de Vida'}
                  </a>
                </div>
              )}
              <div>
                <h4 className="text-lg font-bold text-ink mb-3">{'Experiencia Laboral'}</h4>
                {selectedGraduate.experiences && selectedGraduate.experiences.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedGraduate.experiences.map(exp => (
                      <div key={exp.id} className="card p-4 border border-[var(--border-color)]">
                        <h5 className="font-bold text-ink">{exp.position}</h5>
                        <p className="text-sm font-semibold text-brand-600">{exp.company_name}</p>
                        <p className="text-xs text-ink-secondary mt-1">{new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Presente'}</p>
                        {exp.certificate_url && (
                          <a href={`${GRADUATES_URL}${exp.certificate_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit transition-colors" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            {'Ver Certificado Adjunto'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{'El egresado no ha registrado experiencia laboral.'}</p>
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-ink mb-3">{'Formación Académica'}</h4>
                {selectedGraduate.academic_histories && selectedGraduate.academic_histories.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedGraduate.academic_histories.map(edu => (
                      <div key={edu.id} className="card p-4 border border-[var(--border-color)]">
                        <h5 className="font-bold text-ink">{edu.degree}</h5>
                        <p className="text-sm font-semibold text-brand-600">{edu.institution}</p>
                        <p className="text-xs text-ink-secondary mt-1">{new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'En curso'}</p>
                        {edu.diploma_url && (
                          <a href={`${GRADUATES_URL}${edu.diploma_url}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold w-fit transition-colors" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            {'Ver Diploma Adjunto'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-secondary italic bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">{'El egresado no ha registrado formación académica.'}</p>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

