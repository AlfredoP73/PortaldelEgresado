import React, { useState, useEffect } from 'react';
import { 
  Plus, ExternalLink, Trash2, Edit3, 
  Globe, Layers, FolderOpen
} from 'lucide-react';
import { getMyProjects, createProject, updateProject, deleteProject } from '../../../api';
import toast from 'react-hot-toast';

// ── Tipos de recurso ──────────────────────────────────────────────────────────
const RESOURCE_TYPES = [
  { value: 'github',      label: 'GitHub / GitLab',              emoji: '🐙', placeholder: 'https://github.com/usuario/repo',           hint: 'Repositorio de código' },
  { value: 'behance',     label: 'Behance / Dribbble / Figma',   emoji: '🎨', placeholder: 'https://behance.net/proyecto',               hint: 'Portafolio de diseño' },
  { value: 'youtube',     label: 'YouTube / Vimeo',              emoji: '🎬', placeholder: 'https://youtube.com/watch?v=...',            hint: 'Video demostración' },
  { value: 'drive',       label: 'Google Drive / OneDrive',      emoji: '📄', placeholder: 'https://drive.google.com/file/...',          hint: 'Documento, informe o presentación' },
  { value: 'web',         label: 'Sitio web / Demo en vivo',     emoji: '🌐', placeholder: 'https://mi-proyecto.com',                   hint: 'Aplicación o demo desplegada' },
  { value: 'paper',       label: 'Artículo / Paper / Tesis',     emoji: '📝', placeholder: 'https://doi.org/10.xxxx/...',               hint: 'Publicación académica o tesis' },
  { value: 'repo',        label: 'Repositorio institucional',    emoji: '🏛️', placeholder: 'https://repositorio.universidad.edu/...',   hint: 'Repositorio de la universidad' },
  { value: 'other',       label: 'Otro enlace',                  emoji: '🔗', placeholder: 'https://...',                               hint: 'Cualquier otro recurso' },
] as const;

type ResourceType = typeof RESOURCE_TYPES[number]['value'];

interface Project {
  id: number;
  graduate_id: number;
  title: string;
  description: string | null;
  project_url: string | null;
  repository_url: string | null;
  resource_type: ResourceType | null;
  resource_url: string | null;
  image_url: string | null;
  technologies: string | null;
  created_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getResourceInfo(type: string | null) {
  return RESOURCE_TYPES.find(r => r.value === type) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
}

function getPrimaryUrl(p: Project): string | null {
  return p.resource_url || p.project_url || p.repository_url || null;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GraduateProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    title: '',
    description: '',
    resource_type: 'github' as ResourceType,
    resource_url: '',
    technologies: '',
    image_url: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getMyProjects();
      setProjects(res.data || []);
    } catch {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const selectedResourceType = RESOURCE_TYPES.find(r => r.value === formData.resource_type) ?? RESOURCE_TYPES[0];

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingId(p.id);
    setFormData({
      title: p.title || '',
      description: p.description || '',
      resource_type: (p.resource_type as ResourceType) || 'github',
      resource_url: p.resource_url || p.project_url || p.repository_url || '',
      technologies: p.technologies || '',
      image_url: p.image_url || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!formData.resource_url.trim()) { toast.error('La URL del recurso es obligatoria'); return; }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      resource_type: formData.resource_type,
      resource_url: formData.resource_url.trim(),
      project_url: formData.resource_url.trim(),   // compatibilidad hacia atrás
      technologies: formData.technologies.trim() || undefined,
      image_url: formData.image_url.trim() || undefined,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await updateProject(editingId, payload);
        toast.success('Proyecto actualizado');
      } else {
        await createProject(payload);
        toast.success('Proyecto publicado en tu portafolio');
      }
      setModalOpen(false);
      fetchProjects();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al guardar el proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este proyecto de tu portafolio?')) return;
    try {
      await deleteProject(id);
      toast.success('Proyecto eliminado');
      fetchProjects();
    } catch {
      toast.error('Error al eliminar proyecto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-brand-600" />
            Mi Portafolio
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Comparte tus proyectos, investigaciones, diseños, publicaciones o cualquier trabajo destacable.
            Válido para todas las carreras y disciplinas.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-sm transition-all"
          style={{ backgroundColor: '#087443' }}
        >
          <Plus className="w-4 h-4" />
          <span>Añadir al portafolio</span>
        </button>
      </div>

      {/* Grid de Proyectos */}
      {loading ? (
        <div className="p-12 text-center text-sm text-ink-tertiary">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando portafolio...
        </div>
      ) : projects.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 mx-auto flex items-center justify-center mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ink">Tu portafolio está vacío</h3>
          <p className="text-sm text-ink-secondary max-w-md mx-auto mt-1 mb-6">
            Agrega proyectos de cualquier tipo: código, diseño, investigaciones, videos, documentos o cualquier trabajo que quieras destacar ante empresas y otros egresados.
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm transition-all"
            style={{ backgroundColor: '#087443' }}
          >
            <Plus className="w-4 h-4" />
            <span>Publicar mi primer trabajo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const techs = p.technologies
              ? p.technologies.split(',').map(t => t.trim()).filter(Boolean)
              : [];
            const ri = getResourceInfo(p.resource_type);
            const url = getPrimaryUrl(p);

            return (
              <div
                key={p.id}
                className="rounded-2xl border shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                {/* Cover */}
                {p.image_url ? (
                  <div className="h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div
                    className="h-24 w-full flex items-center justify-center border-b text-4xl"
                    style={{ borderColor: 'var(--border-color)', background: 'linear-gradient(135deg, rgba(8,116,67,0.07) 0%, rgba(34,168,110,0.05) 100%)' }}
                  >
                    {ri.emoji}
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Resource type badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2"
                      style={{ backgroundColor: 'rgba(8,116,67,0.1)', color: '#087443' }}>
                      {ri.emoji} {ri.label}
                    </span>

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-ink text-sm line-clamp-2 flex-1">{p.title}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-brand-600 hover:bg-muted transition-colors" title="Editar">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-ink-secondary line-clamp-2 mb-3 leading-relaxed">{p.description}</p>
                    )}

                    {techs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {techs.map((tech, idx) => (
                          <span key={idx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {url && (
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold flex items-center gap-1.5 transition-colors hover:opacity-80"
                        style={{ color: '#087443' }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver {ri.label}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Crear / Editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <h2 className="text-xl font-bold text-ink mb-1">
              {editingId ? 'Editar trabajo' : 'Añadir al portafolio'}
            </h2>
            <p className="text-xs text-ink-secondary mb-5">
              Visible en tu perfil público para empresas y compañeros egresados. Cualquier carrera y tipo de trabajo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Análisis estadístico de empleabilidad / Campaña publicitaria / App móvil de salud"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="¿Qué problema resuelve? ¿Cuál fue tu rol? ¿Qué lograste?"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              {/* Tipo de recurso */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Tipo de recurso *</label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, resource_type: rt.value })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                        formData.resource_type === rt.value
                          ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                          : 'hover:border-brand-300'
                      }`}
                      style={{
                        borderColor: formData.resource_type === rt.value ? '#087443' : 'var(--border-color)',
                        backgroundColor: formData.resource_type === rt.value ? 'rgba(8,116,67,0.07)' : 'transparent'
                      }}
                    >
                      <span className="text-base">{rt.emoji}</span>
                      <span className="leading-tight">{rt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* URL del recurso */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  URL del recurso * <span className="font-normal text-ink-tertiary">— {selectedResourceType.hint}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-base">{selectedResourceType.emoji}</span>
                  <input
                    type="url"
                    required
                    placeholder={selectedResourceType.placeholder}
                    value={formData.resource_url}
                    onChange={e => setFormData({ ...formData, resource_url: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Tags / tecnologías */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Tags / Habilidades <span className="font-normal text-ink-tertiary">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Python, SPSS, Adobe XD, Tableau, Java, Marketing Digital..."
                  value={formData.technologies}
                  onChange={e => setFormData({ ...formData, technologies: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              {/* Imagen de portada (opcional) */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  URL de imagen de portada <span className="font-normal text-ink-tertiary">(opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border hover:bg-muted transition-colors"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
                  style={{ backgroundColor: '#087443' }}
                >
                  <Globe className="w-4 h-4" />
                  {submitting ? 'Publicando...' : editingId ? 'Guardar cambios' : 'Publicar en mi portafolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
