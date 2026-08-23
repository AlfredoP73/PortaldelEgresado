import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import api from '../../../api';
import { Plus, Trash2, Loader2, Save, Edit2, X, MapPin } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

interface CatalogItem {
  id: number;
  name: string;
}

export default function AdminCities() {
  const activeTab = 'cities';
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/${activeTab}`);
      setItems(res.data);
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      setSaving(true);
      if (editingItem) {
        await api.put(`/${activeTab}/${editingItem.id}`, { name: newItemName });
        toast.success('Ciudad actualizada');
      } else {
        await api.post(`/${activeTab}`, { name: newItemName });
        toast.success('Ciudad creada');
      }
      closeModal();
      fetchItems();
    } catch (error) {
      toast.error(`Error al guardar elemento`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setNewItemName('');
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta ciudad? Podría afectar registros existentes.')) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      fetchItems();
    } catch (error) {
      toast.error(`Error al eliminar. Es posible que esté en uso.`);
    }
  };

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Ciudades</h2>
          <p className="text-sm mt-1 text-ink-secondary">Administra las ciudades donde operan las empresas.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Ciudad
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <MapPin className="w-12 h-12 text-ink-tertiary mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-ink">No hay ciudades registradas</h3>
            <p className="text-ink-secondary mt-1">Crea la primera ciudad para comenzar.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4 w-full">Nombre de la Ciudad</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-ink-secondary font-mono">{item.id}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{item.name}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalItems={items.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} maxWidth="max-w-md">
        <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="text-lg font-bold text-ink font-heading">
            {editingItem ? 'Editar Ciudad' : 'Nueva Ciudad'}
          </h3>
          <button onClick={closeModal} className="text-ink-tertiary hover:text-ink p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="form-label">Nombre de la Ciudad *</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input w-full"
              placeholder="Ej: Valledupar"
              autoFocus
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={closeModal} className="btn-ghost" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> {editingItem ? 'Actualizar' : 'Guardar'}</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

