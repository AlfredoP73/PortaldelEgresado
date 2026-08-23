import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { authApi } from '../../../api';
import { Search, Building2, AlertCircle, Trash2, Edit2, Check, X, Plus, MapPin, Mail, Briefcase, Users, Info, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';
import { exportToExcel, importFromExcel } from '../../../utils/excelUtils';

interface Sector { id: number; name: string }
interface City { id: number; name: string }

interface Company {
  user_id: number;
  name: string;
  description: string;
  contact_email: string;
  status: string;
  sector: Sector;
  city: City;
}

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isAdmin = user?.role_name === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, sectRes, cityRes] = await Promise.all([
        api.get('/companies'),
        api.get('/sectors').catch(() => ({ data: [] })),
        api.get('/cities').catch(() => ({ data: [] }))
      ]);
      setCompanies(compRes.data);
      setSectors(sectRes.data);
      setCities(cityRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/companies/${id}/status`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/companies', {
        name: formData.get('name'),
        description: formData.get('description'),
        contact_email: formData.get('contact_email'),
        sector_id: Number(formData.get('sector_id')),
        city_id: Number(formData.get('city_id')),
      });
      setIsCreating(false);
      fetchData();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Error al registrar empresa. Intente nuevamente.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      contact_email: formData.get('contact_email'),
      sector_id: Number(formData.get('sector_id')),
      city_id: Number(formData.get('city_id')),
    };

    try {
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.user_id}`, data);
      } else {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        // 1. Create User
        const authRes = await authApi.post('/register', { email, password, role_id: 2 });
        const newUserId = authRes.data.user_id;
        
        // 2. Create Company
        await api.post('/companies', { ...data, user_id: newUserId });
      }
      setAdminModalOpen(false);
      setEditingCompany(null);
      fetchData();
    } catch (error: any) {
      console.error('Error in admin submit:', error);
      toast.error(error.response?.data?.detail || 'Error en la operación. Verifique los datos.');
    }
  };

  const handleDeleteCompany = async (userId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/companies/${userId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Error al eliminar empresa.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Vista para la Empresa (Módulo 2 propio)
  if (!isAdmin) {
    const myCompany = companies[0];

    if (!myCompany) {
      if (isCreating) {
        return (
          <div className="max-w-5xl mx-auto mt-10">
            <h2 className="text-2xl font-bold font-heading text-ink mb-6">Completar Perfil de Empresa</h2>
            <form onSubmit={handleCreateCompany} className="card p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-ink-secondary mb-1">Nombre de la Empresa</label>
                <input name="name" type="text" className="input" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-secondary mb-1">Descripción</label>
                <textarea name="description" className="input min-h-[100px]" required></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-secondary mb-1">Correo de Contacto</label>
                <input name="contact_email" type="email" className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-secondary mb-1">Sector</label>
                  <select name="sector_id" className="input bg-white" required>
                    <option value="">Seleccione...</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-secondary mb-1">Ciudad</label>
                  <select name="city_id" className="input bg-white" required>
                    <option value="">Seleccione...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreating(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Empresa</button>
              </div>
            </form>
          </div>
        );
      }

      return (
        <div className="card p-10 text-center max-w-5xl mx-auto mt-10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-white -z-10" />
          <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Building2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-3 font-heading text-ink">Aún no has completado tu perfil corporativo</h2>
          <p className="text-ink-secondary mb-8 leading-relaxed">
            Para publicar vacantes y gestionar candidatos, primero debes registrar los datos de tu empresa y esperar la aprobación de la universidad.
          </p>
          <button onClick={() => setIsCreating(true)} className="btn-primary text-lg px-8 py-3 shadow-xl shadow-brand-500/20">
            <Plus className="w-5 h-5" /> Completar Perfil de Empresa
          </button>
        </div>
      );
    }

    const isApproved = myCompany.status.toUpperCase() === 'APPROVED';
    const isRejected = myCompany.status.toUpperCase() === 'REJECTED';

    return (
      <div className="space-y-6">
        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight" style={{ color: '#172033' }}>
              Mi Perfil Corporativo
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#667085' }}>
              Información pública de tu empresa en el portal.
            </p>
          </div>
          {isApproved ? (
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm"
              style={{ backgroundColor: '#ECFDF3', color: '#027A48', border: '1px solid #ABEFC6' }}
            >
              <Check className="w-3.5 h-3.5" style={{ color: '#027A48' }} />
              APROBADA
            </span>
          ) : isRejected ? (
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm"
              style={{ backgroundColor: '#FEF3F2', color: '#B42318', border: '1px solid #FECDCA' }}
            >
              <X className="w-3.5 h-3.5" style={{ color: '#B42318' }} />
              RECHAZADA
            </span>
          ) : (
            <span 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm"
              style={{ backgroundColor: '#FFFAEB', color: '#B54708', border: '1px solid #FEDF89' }}
            >
              <AlertCircle className="w-3.5 h-3.5" style={{ color: '#B54708' }} />
              EN REVISIÓN
            </span>
          )}
        </div>

        {/* Hero Main Card */}
        <div 
          className="card overflow-hidden !p-0 shadow-sm"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E4E7EC' }}
        >
          {/* Top Banner with Avatar & Company Name */}
          <div 
            className="p-6 sm:p-8 flex items-center gap-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #064E3B 0%, #087443 100%)' }}
          >
            {/* Subtle decorative background circles */}
            <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-32 -bottom-20 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

            {/* Avatar */}
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-extrabold shadow-md shrink-0 relative z-10"
              style={{ backgroundColor: '#064E3B', color: '#FFFFFF', border: '2px solid rgba(255,255,255,0.85)' }}
            >
              {myCompany.name.charAt(0).toUpperCase()}
            </div>

            {/* Title & Metadata in White */}
            <div className="relative z-10 min-w-0">
              <h3 
                className="text-2xl sm:text-3xl font-bold font-heading tracking-tight truncate !text-white"
                style={{ color: '#FFFFFF' }}
              >
                {myCompany.name}
              </h3>
              <div 
                className="flex flex-wrap items-center gap-2 mt-2 text-sm font-medium"
                style={{ color: '#E6F4EE' }}
              >
                <span className="inline-flex items-center gap-1.5" style={{ color: '#E6F4EE' }}>
                  <Building2 className="w-4 h-4 shrink-0" style={{ color: '#E6F4EE' }} />
                  {myCompany.sector?.name || 'Sector no especificado'}
                </span>
                <span style={{ color: 'rgba(230,244,238,0.6)' }}>•</span>
                <span className="inline-flex items-center gap-1.5" style={{ color: '#E6F4EE' }}>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: '#E6F4EE' }} />
                  {myCompany.city?.name || 'Valledupar'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
            {/* Row 1: Acerca de la empresa */}
            <div 
              className="flex items-center justify-between gap-4 pb-6 border-b"
              style={{ borderColor: '#E4E7EC' }}
            >
              <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
                >
                  <Info className="w-5 h-5" style={{ color: '#087443' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 
                    className="text-xs font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: '#087443' }}
                  >
                    Acerca de la empresa
                  </h4>
                  <p 
                    className="text-sm leading-relaxed font-normal"
                    style={{ color: '#667085' }}
                  >
                    {myCompany.description || 'Nuestra empresa ejemplo principal'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0" style={{ color: '#98A2B3' }} />
            </div>

            {/* Row 2: Three Information Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
              {/* Contacto Principal */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
                >
                  <Mail className="w-4 h-4" style={{ color: '#087443' }} />
                </div>
                <div className="min-w-0">
                  <p 
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: '#98A2B3' }}
                  >
                    Contacto Principal
                  </p>
                  <p 
                    className="text-sm font-bold truncate mt-0.5"
                    style={{ color: '#172033' }}
                  >
                    {myCompany.contact_email}
                  </p>
                </div>
              </div>

              {/* Ubicación */}
              <div 
                className="flex items-center gap-4 md:border-l md:pl-6"
                style={{ borderColor: '#E4E7EC' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
                >
                  <MapPin className="w-4 h-4" style={{ color: '#087443' }} />
                </div>
                <div className="min-w-0">
                  <p 
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: '#98A2B3' }}
                  >
                    Ubicación
                  </p>
                  <p 
                    className="text-sm font-bold truncate mt-0.5"
                    style={{ color: '#172033' }}
                  >
                    {myCompany.city?.name || 'Valledupar'}
                  </p>
                </div>
              </div>

              {/* Industria / Sector */}
              <div 
                className="flex items-center gap-4 md:border-l md:pl-6"
                style={{ borderColor: '#E4E7EC' }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
                >
                  <Building2 className="w-4 h-4" style={{ color: '#087443' }} />
                </div>
                <div className="min-w-0">
                  <p 
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: '#98A2B3' }}
                  >
                    Industria / Sector
                  </p>
                  <p 
                    className="text-sm font-bold truncate mt-0.5"
                    style={{ color: '#172033' }}
                  >
                    {myCompany.sector?.name || 'Tecnología y Software'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status alert if pending */}
        {myCompany.status.toUpperCase() === 'PENDING' && (
          <div 
            className="rounded-xl px-5 py-4 flex items-start gap-3"
            style={{ backgroundColor: '#FFFAEB', borderColor: '#FEDF89', border: '1px solid #FEDF89' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B54708' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#B54708' }}>Perfil en revisión</p>
              <p className="text-sm mt-0.5" style={{ color: '#B54708' }}>Tu empresa está siendo verificada por la Oficina de Egresados. Pronto recibirás una respuesta.</p>
            </div>
          </div>
        )}

        {/* Bottom Quick Link Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gestionar Vacantes */}
          <div 
            onClick={() => navigate('/job-offers')}
            className="card p-5 flex items-center justify-between gap-4 cursor-pointer transition-all group hover:shadow-sm"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E4E7EC' }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
              >
                <Briefcase className="w-5 h-5" style={{ color: '#087443' }} />
              </div>
              <div>
                <h4 
                  className="font-bold text-base transition-colors"
                  style={{ color: '#172033' }}
                >
                  Gestionar Vacantes
                </h4>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: '#667085' }}
                >
                  Publica nuevas ofertas laborales
                </p>
              </div>
            </div>
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#087443' }} />
            </div>
          </div>

          {/* Ver Candidatos */}
          <div 
            onClick={() => navigate('/talent-pool')}
            className="card p-5 flex items-center justify-between gap-4 cursor-pointer transition-all group hover:shadow-sm"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E4E7EC' }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
              >
                <Users className="w-5 h-5" style={{ color: '#087443' }} />
              </div>
              <div>
                <h4 
                  className="font-bold text-base transition-colors"
                  style={{ color: '#172033' }}
                >
                  Ver Candidatos
                </h4>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: '#667085' }}
                >
                  Revisa postulaciones activas
                </p>
              </div>
            </div>
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: '#EAF7F1', color: '#087443' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#087443' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista para el Administrador
  return (
    <div className="space-y-6">

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-heading tracking-tight" style={{ color: 'var(--text-main)' }}>{'Directorio de Empresas'}</h2>
          <p className="mt-1" style={{ color: 'var(--text-ink-secondary)' }}>{'Gestiona las empresas aliadas y aprueba sus registros.'}</p>
        </div>
        <button 
          onClick={() => {
            setEditingCompany(null);
            setAdminModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" /> {'Nueva Empresa'}
        </button>
      </div>

      <Modal isOpen={adminModalOpen} onClose={() => { setAdminModalOpen(false); setEditingCompany(null); }} maxWidth="max-w-4xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="text-xl font-bold text-ink font-heading">
            {editingCompany ? 'Editar Empresa' : 'Registrar Nueva Empresa'}
          </h3>
          <button onClick={() => { setAdminModalOpen(false); setEditingCompany(null); }} className="text-ink-tertiary hover:text-ink p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAdminSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {!editingCompany && (
            <>
              <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-2">Credenciales de Acceso</p>
              <div className="grid grid-cols-2 gap-4 bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)] mb-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-secondary mb-1">Email de Usuario</label>
                  <input name="email" type="email" className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-secondary mb-1">Contraseña temporal</label>
                  <input name="password" type="text" className="input" required />
                </div>
              </div>
            </>
          )}
          
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-2">Datos del Perfil</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Nombre de la Empresa</label>
              <input name="name" type="text" className="input" defaultValue={editingCompany?.name || ''} required />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Correo de Contacto Público</label>
              <input name="contact_email" type="email" className="input" defaultValue={editingCompany?.contact_email || ''} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-1">Descripción</label>
            <textarea name="description" className="input min-h-[80px]" defaultValue={editingCompany?.description || ''} required></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Sector</label>
              <select name="sector_id" className="input" defaultValue={editingCompany?.sector?.id || ''} required>
                <option value="">Seleccione...</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-secondary mb-1">Ciudad</label>
              <select name="city_id" className="input" defaultValue={editingCompany?.city?.id || ''} required>
                <option value="">Seleccione...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 mt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={() => { setAdminModalOpen(false); setEditingCompany(null); }} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary">
              {editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </Modal>


      {(() => {
        const filteredCompanies = companies.filter(c => {
          const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
          const matchSector = sectorFilter === 'ALL' || c.sector?.id.toString() === sectorFilter;
          const matchCity = cityFilter === 'ALL' || c.city?.id.toString() === cityFilter;
          const matchStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter;
          return matchSearch && matchSector && matchCity && matchStatus;
        });

        const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        return (
          <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-ink-secondary)' }} />
                  <input
                    type="text"
                    placeholder={'Buscar empresa o correo...'}
                    className="input w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full md:w-auto">
                  <select 
                    className="input w-full sm:w-48" 
                    value={sectorFilter} 
                    onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <option value="ALL">{'Todos los Sectores'}</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id.toString()}>{s.name}</option>
                    ))}
                  </select>
                  
                  <select 
                    className="input w-full sm:w-40" 
                    value={cityFilter} 
                    onChange={(e) => { setCityFilter(e.target.value); setCurrentPage(1); }}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <option value="ALL">{'Todas las Ciudades'}</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>

                  <select 
                    className="input w-full sm:w-36" 
                    value={statusFilter} 
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <option value="ALL">{'Estados'}</option>
                    <option value="APPROVED">{'APROBADA'}</option>
                    <option value="PENDING">{'PENDIENTE'}</option>
                    <option value="REJECTED">{'RECHAZADA'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
            <thead className="text-[12px] font-bold uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-ink-secondary)', backgroundColor: 'var(--bg-muted)' }}>
              <tr>
                <th className="px-6 py-4">{'EMPRESA'}</th>
                <th className="px-6 py-4">{'SECTOR'}</th>
                <th className="px-6 py-4">{'UBICACIÓN'}</th>
                <th className="px-6 py-4 text-center">{'ESTADO'}</th>
                <th className="px-6 py-4 text-right">{'companies.col_actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-tertiary">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-8 h-8 opacity-50" />
                      <p className="text-base font-medium">No se encontraron empresas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((company) => (
                  <tr key={company.user_id} className="hover:bg-[var(--bg-muted)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-main)' }}>{company.name}</div>
                          <div className="text-sm" style={{ color: 'var(--text-ink-secondary)' }}>{company.contact_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-ink-secondary)' }}>
                      {company.sector?.name}
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-ink-secondary)' }}>
                      {company.city?.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={twMerge(
                        "px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border",
                        company.status.toUpperCase() === 'APPROVED' ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]' :
                        company.status.toUpperCase() === 'REJECTED' ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]' :
                        'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                      )}>
                        {company.status.toUpperCase() === 'APPROVED' ? 'APROBADA' : company.status.toUpperCase() === 'REJECTED' ? 'RECHAZADA' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCompany(company);
                            setAdminModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        
                        {company.status.toUpperCase() === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateStatus(company.user_id, 'approved')}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => updateStatus(company.user_id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Rechazar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => handleDeleteCompany(company.user_id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors ml-2"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredCompanies.length > pageSize && (
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredCompanies.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
      );
    })()}
    </div>
  );
}
