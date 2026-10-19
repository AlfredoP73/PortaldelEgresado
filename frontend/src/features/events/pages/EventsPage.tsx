import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Video, Users, Download, Plus, 
  Trash2, Edit3, CheckCircle2, Clock, Building2, 
  Search, FileDown, ShieldAlert, AlertCircle 
} from 'lucide-react';
import { 
  getEvents, getMyEvents, createEvent, updateEvent, 
  registerToEvent, cancelEventRegistration, 
  getEventRegistrations, getEventIcsUrl 
} from '../../../api';
import toast from 'react-hot-toast';

interface EventItem {
  id: number;
  organizer_user_id: number;
  organizer_role: string;
  organizer_name: string;
  title: string;
  description: string;
  modality: string;
  location_or_url: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: string;
  created_at: string;
  registered_count: number;
  is_registered?: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [loading, setLoading] = useState(true);

  // Filtros
  const [modality, setModality] = useState('TODAS');
  const [search, setSearch] = useState('');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    modality: 'VIRTUAL',
    location_or_url: '',
    starts_at: '',
    ends_at: '',
    capacity: ''
  });

  const [registrationsModalEvent, setRegistrationsModalEvent] = useState<EventItem | null>(null);
  const [registrationsList, setRegistrationsList] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const isCompany = currentUser?.role_name === 'COMPANY';
  const isAdmin = currentUser?.role_name === 'ADMIN';
  const isGraduate = currentUser?.role_name === 'GRADUATE';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (modality !== 'TODAS') params.modality = modality;
      if (search) params.q = search;
      const res = await getEvents(params);
      setEvents(res.data || []);

      if (isCompany) {
        const myRes = await getMyEvents();
        setMyEvents(myRes.data || []);
      }
    } catch (e) {
      toast.error('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [modality]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleRegister = async (eventId: number) => {
    try {
      await registerToEvent(eventId);
      toast.success('¡Te has inscrito al evento! Puedes agregar la fecha a tu calendario (.ics).');
      fetchEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al inscribirse');
    }
  };

  const handleCancelRegistration = async (eventId: number) => {
    try {
      await cancelEventRegistration(eventId);
      toast.success('Inscripción cancelada');
      fetchEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al cancelar');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.description.trim() || !newEvent.starts_at || !newEvent.ends_at) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      setCreating(true);
      await createEvent({
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        modality: newEvent.modality,
        location_or_url: newEvent.location_or_url.trim() || null,
        starts_at: new Date(newEvent.starts_at).toISOString(),
        ends_at: new Date(newEvent.ends_at).toISOString(),
        capacity: newEvent.capacity ? parseInt(newEvent.capacity) : null
      });
      toast.success('¡Evento publicado exitosamente!');
      setCreateModalOpen(false);
      setNewEvent({
        title: '',
        description: '',
        modality: 'VIRTUAL',
        location_or_url: '',
        starts_at: '',
        ends_at: '',
        capacity: ''
      });
      fetchEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al publicar evento');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    if (!confirm('¿Seguro que deseas cancelar este evento? Los inscritos serán notificados.')) return;
    try {
      await updateEvent(eventId, { status: 'CANCELLED' });
      toast.success('Evento cancelado');
      fetchEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al cancelar evento');
    }
  };

  const handleOpenRegistrations = async (ev: EventItem) => {
    setRegistrationsModalEvent(ev);
    try {
      setLoadingRegs(true);
      const res = await getEventRegistrations(ev.id);
      setRegistrationsList(res.data || []);
    } catch (e) {
      toast.error('Error al cargar inscritos');
    } finally {
      setLoadingRegs(false);
    }
  };

  const displayList = activeTab === 'my' ? myEvents : events;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Calendar className="w-7 h-7 text-brand-600" />
            Ferias Laborales y Eventos
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Talleres de empleabilidad, ferias de reclutamiento y conferencias organizadas por empresas aliadas y la UPC.
          </p>
        </div>
        {(isCompany || isAdmin) && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-xs"
            style={{ backgroundColor: '#087443' }}
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Nuevo Evento</span>
          </button>
        )}
      </div>

      {/* Tabs si es empresa */}
      {isCompany && (
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'all'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            Todos los Eventos ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'my'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            Mis Eventos Creados ({myEvents.length})
          </button>
        </div>
      )}

      {/* Slicers y Filtros superiores */}
      <div 
        className="p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row items-center gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por título, temática o empresa organizadora..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderColor: 'var(--border-color)' }}
          />
        </form>

        {/* Modalidad Slicers */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border overflow-x-auto w-full md:w-auto" style={{ borderColor: 'var(--border-color)' }}>
          {['TODAS', 'VIRTUAL', 'PRESENCIAL', 'HIBRIDO'].map((m) => (
            <button
              key={m}
              onClick={() => setModality(m)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                modality === m
                  ? 'bg-white dark:bg-neutral-800 text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {m === 'TODAS' ? 'Todas' : m === 'VIRTUAL' ? 'Virtual' : m === 'PRESENCIAL' ? 'Presencial' : 'Híbrido'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Eventos */}
      {loading ? (
        <div className="py-16 text-center text-sm text-ink-tertiary">
          Cargando eventos...
        </div>
      ) : displayList.length === 0 ? (
        <div className="py-16 text-center text-sm text-ink-tertiary">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="font-semibold text-ink">No hay eventos disponibles con estos criterios</p>
          <p className="text-xs mt-1">Pronto nuevas empresas publicarán convocatorias y ferias.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayList.map((ev) => {
            const isOwner = ev.organizer_user_id === currentUser?.id;
            const isCancelled = ev.status === 'CANCELLED';
            const startDate = new Date(ev.starts_at);
            const isVirtual = ev.modality === 'VIRTUAL';
            const isFull = ev.capacity !== null && ev.capacity > 0 && ev.registered_count >= ev.capacity;

            return (
              <div
                key={ev.id}
                className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${
                  isCancelled ? 'opacity-60 bg-muted' : ''
                }`}
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{ev.organizer_name}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCancelled ? 'bg-rose-100 text-rose-700' :
                      isVirtual ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {isCancelled ? 'Cancelado' : ev.modality}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-ink leading-snug line-clamp-2">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-ink-secondary mt-2 line-clamp-3 leading-relaxed">
                    {ev.description}
                  </p>

                  {/* Metadatos Fecha / Lugar */}
                  <div className="mt-4 pt-3 border-t space-y-2 text-xs text-ink-secondary" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="font-semibold text-ink">
                        {startDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}, {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVirtual ? (
                        <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      )}
                      <span className="truncate">
                        {ev.location_or_url || (isVirtual ? 'Enlace virtual en confirmación' : 'Campus UPC')}
                      </span>
                    </div>
                  </div>

                  {/* Barra de cupos */}
                  {ev.capacity ? (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] text-ink-tertiary">
                        <span>Ocupación</span>
                        <span className="font-bold text-ink">{ev.registered_count} / {ev.capacity} cupos</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-500' : 'bg-brand-500'
                          }`}
                          style={{ width: `${Math.min(100, (ev.registered_count / ev.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-[11px] text-ink-tertiary flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-brand-600" />
                      <span>{ev.registered_count} personas inscritas (cupos ilimitados)</span>
                    </div>
                  )}
                </div>

                {/* Acciones Footer */}
                <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-color)' }}>
                  {isGraduate && (
                    <>
                      {ev.is_registered ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => handleCancelRegistration(ev.id)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            Cancelar
                          </button>
                          <a
                            href={getEventIcsUrl(ev.id)}
                            download
                            className="flex-1 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-brand-200"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Agregar a Calendario (.ics)</span>
                          </a>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegister(ev.id)}
                          disabled={isFull || isCancelled}
                          className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          style={{ backgroundColor: '#087443' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isFull ? 'Cupo Lleno' : 'Inscribirme al Evento'}</span>
                        </button>
                      )}
                    </>
                  )}

                  {(isOwner || isAdmin) && (
                    <div className="flex items-center justify-between w-full gap-2">
                      <button
                        onClick={() => handleOpenRegistrations(ev)}
                        className="flex-1 py-2 bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-ink rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Inscritos ({ev.registered_count})</span>
                      </button>
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelEvent(ev.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Cancelar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Evento */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-lg font-bold text-ink">Publicar Nuevo Evento</h3>
                <p className="text-xs text-ink-secondary">
                  Llega a toda la comunidad de egresados de la Universidad Popular del Cesar.
                </p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-ink-tertiary hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Feria Virtual de Empleo Tech 2026"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Descripción / Objetivos *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalla la temática, agenda y requisitos para los egresados..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Modalidad</label>
                  <select
                    value={newEvent.modality}
                    onChange={(e) => setNewEvent({ ...newEvent, modality: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="VIRTUAL">Virtual</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="HIBRIDO">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Cupo Máximo (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ilimitado"
                    value={newEvent.capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Lugar o Enlace de Conexión</label>
                <input
                  type="text"
                  placeholder="Ej: https://meet.google.com/xyz o Auditorio Julio Villazón"
                  value={newEvent.location_or_url}
                  onChange={(e) => setNewEvent({ ...newEvent, location_or_url: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Fecha y Hora de Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.starts_at}
                    onChange={(e) => setNewEvent({ ...newEvent, starts_at: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Fecha y Hora de Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.ends_at}
                    onChange={(e) => setNewEvent({ ...newEvent, ends_at: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  style={{ backgroundColor: '#087443' }}
                >
                  <span>{creating ? 'Publicando...' : 'Publicar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Inscritos con Exportación CSV */}
      {registrationsModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-base font-bold text-ink">Inscritos: {registrationsModalEvent.title}</h3>
                <p className="text-xs text-ink-secondary">
                  Total inscritos: {registrationsList.length} participantes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/modulo2/events/${registrationsModalEvent.id}/registrations/csv`}
                  download
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </a>
                <button onClick={() => setRegistrationsModalEvent(null)} className="p-1 text-ink-tertiary hover:text-ink">
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {loadingRegs ? (
                <p className="text-center py-8 text-sm text-ink-tertiary">Cargando participantes...</p>
              ) : registrationsList.length === 0 ? (
                <p className="text-center py-8 text-sm text-ink-tertiary italic">Aún no hay egresados inscritos en este evento.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-ink-tertiary uppercase text-[10px]" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="py-2.5 px-3">Egresado</th>
                      <th className="py-2.5 px-3">Correo</th>
                      <th className="py-2.5 px-3">Fecha de Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {registrationsList.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50">
                        <td className="py-2.5 px-3 font-semibold text-ink">{r.graduate_name || `ID #${r.graduate_id}`}</td>
                        <td className="py-2.5 px-3 text-ink-secondary">{r.graduate_email || '—'}</td>
                        <td className="py-2.5 px-3 text-ink-tertiary">
                          {new Date(r.registered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

