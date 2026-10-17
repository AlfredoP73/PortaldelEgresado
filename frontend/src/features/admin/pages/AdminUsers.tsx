import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { authApi } from '../../../api';
import { Search, Plus, Mail, ShieldAlert, PlayCircle, Loader2, Download, Upload, KeyRound, Eye, EyeOff } from 'lucide-react';
import Pagination from '../../../components/Pagination';
import { exportToExcel, importFromExcel } from '../../../utils/excelUtils';
import Modal from '../../../components/Modal';

interface User {
  id: number;
  email: string;
  role_id: number;
  role_name: string;
  is_active?: boolean;
  email_verified?: boolean;
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

  // Edit user (admin: correo y/o contraseña de cualquier usuario)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditEmail(u.email);
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const payload: { email?: string; password?: string } = {};
    if (editEmail.trim() && editEmail.trim().toLowerCase() !== editingUser.email.toLowerCase()) {
      payload.email = editEmail.trim();
    }
    if (editPassword) payload.password = editPassword;
    if (!payload.email && !payload.password) {
      toast.error('No hay cambios que guardar');
      return;
    }
    try {
      setUpdating(true);
      const res = await authApi.put(`/users/${editingUser.id}`, payload);
      // Si el admin cambió su propio correo, el token anterior deja de ser válido
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        if (res.data.user) localStorage.setItem('user', JSON.stringify({ ...currentUser, ...res.data.user }));
      }
      toast.success(res.data.message || 'Usuario actualizado');
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Error al actualizar usuario');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map(u => ({
      'ID Usuario': u.id,
      'Email': u.email,
      'Rol': u.role_name,
      'ID Rol': u.role_id,
      'Estado': (u.is_active !== false && u.email_verified !== false) ? 'Activo' : 'Inactivo (Por activar)'
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
            role_id: Number(row['ID Rol']),
            accept_privacy_policy: true,
            authorize_data_treatment: true
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
        role_id: roleId,
        accept_privacy_policy: true,
        authorize_data_treatment: true
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
            <h2 className="page-title">Gestión de Usuarios</h2>
            <p className="text-sm mt-1 text-ink-secondary">Administra todos los accesos al sistema.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleExportExcel} 
              className="btn-outline flex items-center gap-2"
              disabled={loading || users.length === 0}
            >
              <Download className="w-4 h-4" /> Exportar
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
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} maxWidth="max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0 border-[var(--border-color)] bg-[var(--bg-surface)]">
          <h3 className="text-lg font-bold text-ink">Registrar Nuevo Usuario</h3>
        </div>
        <form onSubmit={handleRegister} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Correo Electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input w-full" placeholder="ejemplo@correo.com" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input w-full" placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Rol del Usuario</label>
            <select value={roleId} onChange={e => setRoleId(Number(e.target.value))} className="input w-full">
              <option value={1}>ADMIN (Administrador del Portal)</option>
              <option value={2}>COMPANY (Empresa Aliada)</option>
              <option value={3}>GRADUATE (Egresado)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" disabled={saving}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary min-w-[140px] flex justify-center items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} maxWidth="max-w-lg">
        <div className="flex justify-between items-center p-6 border-b shrink-0 border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div>
            <h3 className="text-lg font-bold text-ink">Editar credenciales</h3>
            <p className="text-xs text-ink-secondary mt-0.5">{editingUser?.role_name} · ID {editingUser?.id}</p>
          </div>
        </div>
        <form onSubmit={handleUpdateUser} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Correo electrónico</label>
            <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Dejar vacío para no cambiarla"
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink">
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-ink-secondary mt-1">Como administrador no necesitas la contraseña actual. Mínimo 6 caracteres.</p>
          </div>
          {editingUser?.id === currentUser?.id && (
            <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
              Estás editando tu propia cuenta.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost" disabled={updating}>Cancelar</button>
            <button type="submit" disabled={updating} className="btn-primary min-w-[140px] flex justify-center items-center gap-2">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-secondary" />
              <input
                type="text"
                placeholder="Buscar por email..."
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
                <option value="ALL">Todos los Roles</option>
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
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">ID</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Email</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Rol</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold text-ink-secondary uppercase text-[11px] tracking-wider text-right">Acciones</th>
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
                    <td className="px-6 py-4">
                      {(user.is_active !== false && user.email_verified !== false) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800" title="Cuenta pre-registrada o importada pendiente de activación por correo">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Inactivo (Por activar)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-[var(--border-color)] text-ink hover:bg-[var(--bg-muted)]"
                        >
                          <KeyRound className="w-4 h-4" /> Editar
                        </button>
                        {user.role_name !== 'ADMIN' && (
                          <button
                            onClick={() => handleImpersonate(user.id)}
                            className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-brand-200"
                          >
                            <PlayCircle className="w-4 h-4" /> Impersonar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-ink-secondary italic">
                      No se encontraron usuarios
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
