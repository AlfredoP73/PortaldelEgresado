import { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import api from '../../../api';
import Modal from '../../../components/Modal';

interface AddSubProcessModalProps {
  jobId: number;
  stage: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubProcessModal({ jobId, stage, onClose, onSuccess }: AddSubProcessModalProps) {
  const [loading, setLoading] = useState(false);
  const [subProcessForm, setSubProcessForm] = useState({
    tipo: 'prueba_tecnica',
    nombre: '',
    descripcion: '',
    fecha_limite: '',
    es_formulario: false,
    enlace_adjunto: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/jobs/${jobId}/stages/${stage}/sub-processes`, {
        ...subProcessForm,
        etapa_kanban: stage
      });
      toast.success(`Sub-proceso añadido a todos los candidatos en ${stage}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear sub-proceso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex justify-between items-center p-6">
          <div>
            <h3 className="text-xl font-bold text-ink font-heading">Añadir Sub-proceso</h3>
            <p className="text-sm text-brand-600 font-semibold">Etapa: {stage}</p>
          </div>
          <button onClick={onClose} className="transition-colors p-1.5 rounded-full hover-bg-muted" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Tipo</label>
              <select className="input" value={subProcessForm.tipo} onChange={e => setSubProcessForm({...subProcessForm, tipo: e.target.value})} required>
                <option value="prueba_tecnica">Prueba Técnica</option>
                <option value="prueba_psicotecnica">Prueba Psicotécnica</option>
                <option value="entrevista">Entrevista</option>
                <option value="verificacion_referencias">Verificación de Referencias</option>
                <option value="revision_documentos">Revisión de Documentos</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Nombre Corto</label>
              <input className="input" type="text" required placeholder="Ej: Entrevista Técnica" value={subProcessForm.nombre} onChange={e => setSubProcessForm({...subProcessForm, nombre: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Descripción / Instrucciones</label>
            <textarea className="input min-h-[100px]" placeholder="Instrucciones para el candidato..." value={subProcessForm.descripcion} onChange={e => setSubProcessForm({...subProcessForm, descripcion: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Enlace adjunto (Opcional)</label>
              <input className="input" type="url" placeholder="https://meet.google.com/..." value={subProcessForm.enlace_adjunto} onChange={e => setSubProcessForm({...subProcessForm, enlace_adjunto: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Fecha Límite (Opcional)</label>
              <input className="input" type="datetime-local" value={subProcessForm.fecha_limite} onChange={e => setSubProcessForm({...subProcessForm, fecha_limite: e.target.value})} />
            </div>
          </div>
          
          <div className="mt-4 bg-brand-50 p-4 rounded-xl border border-brand-100">
            <p className="text-sm text-brand-800">
              <strong>Nota:</strong> Este sub-proceso será asignado a <strong>todos</strong> los candidatos que actualmente se encuentren en la etapa de <strong>{stage}</strong>, así como a futuros candidatos que lleguen a ella.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-[var(--border-color)]">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar y Asignar a Todos'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
