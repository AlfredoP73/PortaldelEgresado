import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { Plus, Trash2, Loader2, Save, Edit2, X, MapPin, Download, Upload } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';
import { exportToExcel, importFromExcel } from '../../../utils/excelUtils';
import { useTranslation } from '../../../context/LanguageContext';

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
  const [importing, setImporting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handleExportExcel = () => {
    const dataToExport = items.map(item => ({
      'ID': item.id,
      'Nombre': item.name
    }));
    exportToExcel(dataToExport, 'Ciudades');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const requiredCols = ['Nombre'];
      const data = await importFromExcel(file, requiredCols);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          await api.post(`/${activeTab}`, { name: row['Nombre'] });
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Error importando ciudad:', row, err);
        }
      }

      toast.success(`Importación completa: ${successCount} exitosos, ${errorCount} errores.`);
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Error al importar Excel');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  };

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
          <h2 className="page-title text-[var(--text-main)]">{t('cities.title')}</h2>
          <p className="text-sm mt-1 text-[var(--text-ink-secondary)]">{t('cities.subtitle')}</p>

        </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel} 
              className="btn-outline flex items-center gap-2"
              disabled={loading || items.length === 0}
            >
              <Download className="w-4 h-4" /> {t('common.export')}
            </button>
            <label className={`btn-outline flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? t('common.importing') : t('common.import')}
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                className="hidden" 
                onChange={handleImportExcel}
                disabled={importing}
              />
            </label>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('cities.new')}
            </button>
          </div>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <MapPin className="w-12 h-12 mb-4 opacity-50" style={{ color: 'var(--text-ink-tertiary)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{t('cities.empty_title')}</h3>
            <p className="mt-1" style={{ color: 'var(--text-ink-secondary)' }}>{t('cities.empty_desc')}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{t('common.id')}</th>
                  <th className="px-6 py-4 w-full font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{t('cities.col_name')}</th>
                  <th className="px-6 py-4 text-right font-bold uppercase text-[11px] tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-6 py-4 font-mono" style={{ color: 'var(--text-ink-secondary)' }}>{item.id}</td>
                    <td className="px-6 py-4 font-semibold" style={{ color: 'var(--text-main)' }}>{item.name}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 rounded-lg transition-colors border border-transparent"
                        style={{ color: 'var(--accent-primary)' }}
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
          <h3 className="text-lg font-bold font-heading" style={{ color: 'var(--text-main)' }}>
            {editingItem ? t('cities.modal_edit') : t('cities.modal_new')}
          </h3>
          <button onClick={closeModal} className="p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-ink-tertiary)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="form-label">{t('cities.input_label')}</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input w-full"
              placeholder={t('cities.input_placeholder')}
              autoFocus
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={closeModal} className="btn-ghost" disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</>
              ) : (
                <><Save className="w-4 h-4" /> {editingItem ? t('common.update') : t('common.save')}</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

