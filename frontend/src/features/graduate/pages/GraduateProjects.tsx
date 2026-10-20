import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, Plus, ExternalLink, Trash2, Edit3, 
  Sparkles, Layers, CheckCircle2, AlertCircle, Code2, Globe 
} from 'lucide-react';
import { getMyProjects, createProject, updateProject, deleteProject } from '../../../api';
import toast from 'react-hot-toast';

interface Project {
  id: number;
  graduate_id: number;
  title: string;
  description: string | null;
  project_url: string | null;
  repository_url: string | null;
  image_url: string | null;
  technologies: string | null;
  created_at?: string;
}

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function GraduateProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_url: '',
    repository_url: '',
    image_url: '',
    technologies: ''
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getMyProjects();
      setProjects(res.data || []);
    } catch (e) {
      toast.error('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      project_url: '',
      repository_url: '',
      image_url: '',
      technologies: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingId(p.id);
    setFormData({
      title: p.title || '',
      description: p.description || '',
      project_url: p.project_url || '',
      repository_url: p.repository_url || '',
      image_url: p.image_url || '',
      technologies: p.technologies || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título del proyecto es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await updateProject(editingId, formData);
        toast.success('Proyecto actualizado exitosamente');
      } else {
        await createProject(formData);
        toast.success('Proyecto publicado en tu perfil y portafolio');
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
    if (!confirm('¿Estás seguro de eliminar este proyecto de tu portafolio?')) return;
    try {
      await deleteProject(id);
      toast.success('Proyecto eliminado');
      fetchProjects();
    } catch (e) {
      toast.error('Error al eliminar proyecto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <FolderGit2 className="w-7 h-7 text-brand-600" />
            Mis Proyectos y Portafolio
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Destaca tus desarrollos técnicos, investigaciones y proyectos para que empresas reclutadoras y otros egresados conozcan tu trabajo práctico.
          </p>
        </div>
        <div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Grid de Proyectos */}
      {loading ? (
        <div className="p-12 text-center text-sm text-ink-tertiary">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando tu portafolio de proyectos...
        </div>
      ) : projects.length === 0 ? (
        <div 
          className="p-12 rounded-2xl border text-center shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 mx-auto flex items-center justify-center mb-4">
            <Code2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ink">Aún no has agregado proyectos a tu portafolio</h3>
          <p className="text-sm text-ink-secondary max-w-md mx-auto mt-1 mb-6">
            Los reclutadores dan 3x más prioridad a perfiles con proyectos demostrables. Agrega tus repositorios, aplicaciones web, modelos o investigaciones.
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar mi primer proyecto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const techs = p.technologies
              ? p.technologies.split(',').map((t) => t.trim()).filter(Boolean)
              : [];

            return (
              <div
                key={p.id}
                className="rounded-2xl border shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                {p.image_url ? (
                  <div className="h-44 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-brand-600/10 via-brand-500/5 to-teal-500/10 flex items-center justify-center border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <Code2 className="w-10 h-10 text-brand-600/40" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-ink text-base line-clamp-1">{p.title}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-brand-600 hover:bg-muted transition-colors"
                          title="Editar proyecto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-ink-secondary line-clamp-3 mb-4 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {techs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {techs.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
                    {p.project_url && (
                      <a
                        href={p.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Demo en Vivo</span>
                      </a>
                    )}
                    {p.repository_url && (
                      <a
                        href={p.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-ink-secondary hover:text-ink flex items-center gap-1 transition-colors"
                      >
                        <GithubIcon className="w-3.5 h-3.5" />
                        <span>Repositorio</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Proyecto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <h2 className="text-xl font-bold text-ink mb-1">
              {editingId ? 'Editar Proyecto' : 'Publicar Nuevo Proyecto'}
            </h2>
            <p className="text-xs text-ink-secondary mb-5">
              Este proyecto aparecerá visible en tu perfil público para empresas y compañeros egresados.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Título del Proyecto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sistema de Monitoreo IoT con Microservicios"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe el objetivo, tu rol y el impacto o solución implementada..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Tecnologías y Habilidades (separadas por coma)
                </label>
                <input
                  type="text"
                  placeholder="Ej: React, FastAPI, Docker, AWS Fargate, PostgreSQL"
                  value={formData.technologies}
                  onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    URL Demo en Vivo (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://mi-proyecto.com"
                    value={formData.project_url}
                    onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    URL Repositorio (GitHub/GitLab)
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/usuario/repo"
                    value={formData.repository_url}
                    onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  URL de Imagen de Portada (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
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
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all flex items-center gap-2"
                >
                  {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Publicar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
