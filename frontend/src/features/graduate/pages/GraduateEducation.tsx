import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { graduatesApi } from '../../../api';
import { GraduationCap, Plus, Trash2, Upload, Loader2, X, Save, FileText } from 'lucide-react';
import Modal from '../../../components/Modal';

const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL || 'http://localhost:8003';

interface AcademicHistory {
  id: number;
  institution: string;
  degree: string;
  start_date: string;
  end_date?: string;
  diploma_url?: string;
}

export default function GraduateEducation() {
  const [education, setEducation] = useState<AcademicHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await graduatesApi.get('/profile');
      setEducation(res.data?.academic_histories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const diplomaFile = fd.get('diploma') as File;
    
    if (diplomaFile && diplomaFile.size > 0 && diplomaFile.type !== 'application/pdf') {
      toast.error('El diploma debe ser un archivo PDF');
      return;
    }

    try {
      const res = await graduatesApi.post('/academic_histories', {
        institution: fd.get('institution'),
        degree: fd.get('degree'),
        start_date: fd.get('start_date'),
        end_date: fd.get('end_date') || null,
      });
      
      const newEdu = res.data;
      if (diplomaFile && diplomaFile.size > 0) {
        const fileData = new FormData();
        fileData.append('file', diplomaFile);
        await graduatesApi.post(`/education/${newEdu.id}/diploma`, fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al agregar estudio');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este historial académico?')) return;
    try {
      await graduatesApi.delete(`/academic_histories/${id}`);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar historial académico');
    }
  };

  const handleUploadDiploma = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingId(id);
      await graduatesApi.post(`/education/${id}/diploma`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      toast.success('Diploma subido exitosamente');
    } catch (error) {
      console.error('Error uploading diploma:', error);
      toast.error('Error al subir el diploma');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Historial Académico</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Añade tus estudios de pregrado, posgrado y cursos, adjuntando tus diplomas.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar Estudio
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : education.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap className="w-12 h-12 text-ink-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-ink">Sin historial académico registrado</h3>
          <p className="text-ink-secondary mt-2 max-w-md mx-auto">Añade tu formación profesional y otros estudios relevantes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map(edu => (
            <div key={edu.id} className="card p-6 flex flex-col md:flex-row gap-6 justify-between items-start group relative">
              <div className="flex-1">
                <h4 className="text-xl font-bold text-ink">{edu.degree}</h4>
                <p className="text-md text-brand-600 font-semibold mb-2">{edu.institution}</p>
                <div className="text-sm font-medium bg-ink-50 text-ink-secondary inline-block px-3 py-1 rounded-full">
                  {new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'En curso'}
                </div>
              </div>
              <div className="flex flex-col gap-3 min-w-[200px] shrink-0">
                {edu.diploma_url ? (
                  <div className="flex flex-col gap-2">
                    <a href={`${GRADUATES_URL}${edu.diploma_url}`} target="_blank" rel="noreferrer" className="block relative w-full h-32 rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-brand-500 transition-colors group bg-white shadow-sm">
                      {/* PDF Thumbnail Hack using iframe scaling */}
                      <iframe 
                        src={`${GRADUATES_URL}${edu.diploma_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                        className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                        tabIndex={-1}
                      />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/10 transition-colors flex items-center justify-center backdrop-blur-[0px] group-hover:backdrop-blur-[2px]">
                        <FileText className="w-8 h-8 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100 duration-300" />
                      </div>
                    </a>
                    <a href={`${GRADUATES_URL}${edu.diploma_url}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-bold text-sm transition-colors">
                      <FileText className="w-4 h-4" /> Ver Documento
                    </a>
                  </div>
                ) : (
                  <div>
                    <input type="file" id={`diploma-${edu.id}`} className="hidden" accept=".pdf" onChange={(e) => handleUploadDiploma(edu.id, e)} disabled={uploadingId === edu.id} />
                    <label htmlFor={`diploma-${edu.id}`} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-ink-50 text-ink hover:bg-ink-100 rounded-xl font-bold text-sm transition-colors cursor-pointer border border-ink-200">
                      {uploadingId === edu.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Subir Diploma PDF
                    </label>
                  </div>
                )}
                <button onClick={() => handleDelete(edu.id)} className="flex items-center justify-center gap-2 w-full px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth="max-w-3xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="text-xl font-bold text-ink font-heading">Agregar Historial Académico</h3>
          <button onClick={() => setShowModal(false)} className="text-ink-tertiary hover:text-ink p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAdd} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Título / Grado *</label>
            <input name="degree" className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Institución *</label>
            <input name="institution" className="input w-full" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Fecha Inicio *</label>
              <input name="start_date" type="date" className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Fecha Fin</label>
              <input name="end_date" type="date" className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Diploma (PDF)</label>
            <input type="file" name="diploma" accept=".pdf" className="input w-full p-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

