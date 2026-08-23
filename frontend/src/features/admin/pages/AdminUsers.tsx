import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { authApi } from '../../../api';
import { Search, Plus, Mail, ShieldAlert, PlayCircle, Loader2, Download, Upload } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import { exportToExcel, importFromExcel } from '../../../utils/excelUtils';
import { useTranslation } from '../../../context/LanguageContext';

interface User {
  id: number;
  email: string;
  role_id: number;
  role_name: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Registration form
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(2); // Default to COMPANY
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map(u => ({
      'ID Usuario': u.id,
      'Email': u.email,
      'Rol': u.role_name,
      'ID Rol': u.role_id
    }));
    exportToExcel(dataToExport, 'Usuarios');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const requiredCols = ['Email', 'Contraseña', 'ID Rol'];
      const data = await importFromExcel(file, requiredCols);
      
      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          await authApi.post('/register', {
            email: row['Email'],
            password: row['Contraseña'],
            role_id: Number(row['ID Rol'])
          });
          successCount++;
        } catch (err) {
          errorCount++;
          console.error('Error importando usuario:', row, err);
        }
      }

      toast.success(`Importación completa: ${successCount} exitosos, ${errorCount} errores.`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al importar Excel');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authApi.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await authApi.post('/register', {
        email,
        password,
        role_id: roleId
      });
      setShowForm(false);
      setEmail('');
      setPassword('');
      setRoleId(2);
      fetchUsers();
      toast.success('Usuario creado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
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
      // Redirigir dependiendo del rol para tener la vista correcta
      if (user.role_name === 'COMPANY') {
        window.location.href = '/companies';
      } else if (user.role_name === 'GRADUATE') {
        window.location.href = '/profile';
      } else {
        window.location.href = '/admin/graduates';
      }
    } catch (error) {
      toast.error('Error al impersonar usuario');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role_name === roleFilter;
    return matchSearch && matchRole;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="page-title">{t('users.title')}</h2>
            <p className="text-sm mt-1 text-ink-secondary">{t('users.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleExportExcel} 
              className="btn-outline flex items-center gap-2"
              disabled={loading || users.length === 0}
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
            <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('users.new')}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 animate-fade-in border-l-4 border-brand-500">
          <h3 className="text-lg font-bold text-ink mb-4">{t('users.register_title')}</h3>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{t('users.email_label')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{t('users.password_label')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input w-full" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">{t('users.role_label')}</label>
              <select value={roleId} onChange={e => setRoleId(Number(e.target.value))} className="input w-full">
                <option value={1}>ADMIN</option>
                <option value={2}>COMPANY</option>
                <option value={3}>GRADUATE</option>
              </select>
            </div>
            <div>
              <button type="submit" disabled={saving} className="btn-primary w-full flex justify-center items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
              <input
                type="text"
                placeholder={t('users.search_placeholder')}
                className="input w-full pl-9"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="w-full md:w-auto">
              <select 
                className="input w-full sm:w-48" 
                value={roleFilter} 
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="ALL">{t('users.all_roles')}</option>
                <option value="ADMIN">Admin</option>
                <option value="COMPANY">Company</option>
                <option value="GRADUATE">Graduate</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{t('common.id')}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{t('users.col_email')}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">{t('users.col_role')}</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-6 py-4 text-ink-secondary font-mono">{user.id}</td>
                    <td className="px-6 py-4 font-bold text-ink flex items-center gap-2">
                      <Mail className="w-4 h-4 text-ink-secondary" /> {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        user.role_name === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        user.role_name === 'COMPANY' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role_name === 'ADMIN' && <ShieldAlert className="w-3 h-3" />}
                        {user.role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role_name !== 'ADMIN' && (
                        <button
                          onClick={() => handleImpersonate(user.id)}
                          className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-brand-200"
                        >
                          <PlayCircle className="w-4 h-4" /> {t('users.impersonate')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-ink-secondary italic">
                      {t('users.no_results')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredUsers.length > pageSize && (
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
