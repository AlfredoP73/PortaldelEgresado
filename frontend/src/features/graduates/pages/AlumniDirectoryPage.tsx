import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, GraduationCap, Briefcase, Award, 
  Sparkles, CheckCircle2, XCircle, MessageSquare, 
  Send, UserCheck, ShieldCheck, ChevronRight, Eye,
  ExternalLink, FolderGit2, UserPlus, Clock,
  Check, X, ArrowRight, Network, Percent
} from 'lucide-react';
import { 
  getAlumniDirectory, getMentorships, requestMentorship, 
  updateMentorshipStatus, getMentorProfile, saveMentorProfile,
  getGraduatePublicProfile, getConnections, sendConnectionRequest,
  respondConnection, getConnectionStatus, getNetworkSuggestions
} from '../../../api';
import toast from 'react-hot-toast';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

// Resource type icons and labels
const resourceTypeInfo: Record<string, { emoji: string; label: string }> = {
  github: { emoji: 'ðŸ™', label: 'GitHub / GitLab' },
  behance: { emoji: 'ðŸŽ¨', label: 'Behance / Dribbble' },
  youtube: { emoji: 'ðŸŽ¬', label: 'YouTube / Vimeo' },
  drive: { emoji: 'ðŸ“„', label: 'Google Drive / OneDrive' },
  web: { emoji: 'ðŸŒ', label: 'Sitio Web / Demo' },
  paper: { emoji: 'ðŸ“', label: 'ArtÃ­culo / Paper' },
  institutional: { emoji: 'ðŸ›ï¸', label: 'Repositorio Institucional' },
  other: { emoji: 'ðŸ”—', label: 'Enlace Externo' },
};

export default function AlumniDirectoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'network' | 'directory' | 'connections' | 'mentorships'>('network');
  const [graduates, setGraduates] = useState<any[]>([]);
  const [networkSuggestions, setNetworkSuggestions] = useState<any[]>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [connections, setConnections] = useState<{ incoming: any[]; sent: any[]; accepted: any[] }>({
    incoming: [],
    sent: [],
    accepted: []
  });
  const [loading, setLoading] = useState(true);

  // Filtros Directorio
  const [search, setSearch] = useState('');
  const [mentorsOnly, setMentorsOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Modal Perfil PÃºblico & Proyectos
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null);
  const [publicProfile, setPublicProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Modal Enviar Solicitud ConexiÃ³n
  const [connectModalUser, setConnectModalUser] = useState<any | null>(null);
  const [connectNote, setConnectNote] = useState('');
  const [sendingConnect, setSendingConnect] = useState(false);

  // Modal MentorÃ­a
  const [requestModalMentor, setRequestModalMentor] = useState<any | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestGoal, setRequestGoal] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Modal ConfiguraciÃ³n Mentor
  const [mentorConfigOpen, setMentorConfigOpen] = useState(false);
  const [mentorHeadline, setMentorHeadline] = useState('');
  const [mentorBio, setMentorBio] = useState('');
  const [mentorAreas, setMentorAreas] = useState('');
  const [savingMentor, setSavingMentor] = useState(false);

  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const isGraduate = currentUser?.role_name === 'GRADUATE';

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.q = search;
      if (mentorsOnly) params.mentors_only = true;
      if (selectedYear) params.graduation_year = parseInt(selectedYear);
      const res = await getAlumniDirectory(params);
      setGraduates(res.data || []);
    } catch (e) {
      toast.error('Error al cargar directorio');
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkSuggestions = async () => {
    try {
      setLoadingNetwork(true);
      const res = await getNetworkSuggestions();
      setNetworkSuggestions(res.data || []);
    } catch (e) {
      // silent - may fail if not graduate
    } finally {
      setLoadingNetwork(false);
    }
  };

  const fetchConnectionsData = async () => {
    try {
      const res = await getConnections();
      if (res.data) {
        setConnections({
          incoming: res.data.incoming || [],
          sent: res.data.sent || [],
          accepted: res.data.accepted || []
        });
      }
    } catch (e) {
      // silent
    }
  };

  const fetchMentorships = async () => {
    try {
      const res = await getMentorships();
      setMentorships(res.data || []);
    } catch (e) {
      // silent
    }
  };

  const fetchMyMentorProfile = async () => {
    try {
      const res = await getMentorProfile();
      if (res.data) {
        setMentorHeadline(res.data.headline || '');
        setMentorBio(res.data.bio || '');
        setMentorAreas((res.data.areas_json || []).join(', '));
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'directory') {
      fetchDirectory();
    }
  }, [activeTab, mentorsOnly, selectedYear]);

  useEffect(() => {
    if (activeTab === 'connections') {
      fetchConnectionsData();
    } else if (activeTab === 'mentorships') {
      fetchMentorships();
    } else if (activeTab === 'network') {
      fetchNetworkSuggestions();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchMyMentorProfile();
    fetchConnectionsData();
    fetchNetworkSuggestions();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDirectory();
  };

  const handleOpenPublicProfile = async (userId: number) => {
    try {
      setSelectedProfileUserId(userId);
      setLoadingProfile(true);
      const res = await getGraduatePublicProfile(userId);
      setPublicProfile(res.data);
    } catch (e: any) {
      toast.error('No se pudo cargar el perfil pÃºblico');
      setSelectedProfileUserId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSendConnection = async (targetUserId: number, message?: string) => {
    try {
      setSendingConnect(true);
      const res = await sendConnectionRequest({
        target_user_id: targetUserId,
        message: message?.trim() || undefined
      });
      toast.success('Â¡Solicitud de conexiÃ³n enviada con Ã©xito!');
      setConnectModalUser(null);
      setConnectNote('');
      fetchConnectionsData();
      fetchNetworkSuggestions();
      if (publicProfile && publicProfile.user_id === targetUserId) {
        setPublicProfile({
          ...publicProfile,
          connection_status: 'PENDING',
          connection_id: res.data.connection_id
        });
      }
      // Update suggestion status
      setNetworkSuggestions(prev => prev.map(s => 
        s.user_id === targetUserId ? { ...s, connection_status: 'PENDING' } : s
      ));
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al enviar solicitud de conexiÃ³n');
    } finally {
      setSendingConnect(false);
    }
  };

  const handleRespondConnection = async (connectionId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      await respondConnection(connectionId, action);
      toast.success(action === 'ACCEPT' ? 'Â¡ConexiÃ³n aceptada! Ahora pueden enviarse mensajes directos.' : 'Solicitud rechazada');
      fetchConnectionsData();
      if (publicProfile && publicProfile.connection_id === connectionId) {
        setPublicProfile({
          ...publicProfile,
          connection_status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al responder a la conexiÃ³n');
    }
  };

  const handleSendMentorshipRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalMentor) return;
    if (!requestMessage.trim()) {
      toast.error('Por favor escribe un mensaje de presentaciÃ³n');
      return;
    }

    try {
      setSendingRequest(true);
      await requestMentorship({
        mentor_id: requestModalMentor.user_id,
        message: requestMessage.trim(),
        goal: requestGoal.trim() || undefined
      });
      toast.success('Â¡Solicitud de mentorÃ­a enviada exitosamente!');
      setRequestModalMentor(null);
      setRequestMessage('');
      setRequestGoal('');
      fetchMentorships();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al enviar solicitud');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateMentorshipStatus(id, status);
      toast.success(status === 'ACCEPTED' ? 'MentorÃ­a aceptada. Â¡ConversaciÃ³n creada!' : 'Solicitud actualizada');
      fetchMentorships();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al actualizar');
    }
  };

  const handleSaveMentorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMentor(true);
      const areasList = mentorAreas.split(',').map((a) => a.trim()).filter(Boolean);
      await saveMentorProfile({
        headline: mentorHeadline.trim(),
        bio: mentorBio.trim(),
        areas_json: areasList,
        max_mentees: 3,
        is_active: true
      });
      toast.success('Â¡Perfil de mentor guardado y activo en el directorio!');
      setMentorConfigOpen(false);
      fetchDirectory();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al guardar perfil de mentor');
    } finally {
      setSavingMentor(false);
    }
  };

  const receivedRequests = mentorships.filter((m) => m.mentor_id === currentUser?.id);
  const sentRequests = mentorships.filter((m) => m.mentee_id === currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-600" />
            Mi Red Profesional
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Conecta con egresados afines a tu perfil, forja conexiones y encuentra mentores.
          </p>
        </div>
        {isGraduate && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMentorConfigOpen(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border flex items-center gap-2 transition-all hover:bg-muted"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Ser Mentor UPC</span>
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white flex items-center gap-2 transition-all hover:bg-brand-700 shadow-sm"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Mi Portafolio</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
        {isGraduate && (
          <button
            onClick={() => setActiveTab('network')}
            className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'network'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <Network className="w-4 h-4" />
            Sugerencias de Red
          </button>
        )}

        <button
          onClick={() => setActiveTab('directory')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'directory'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-ink-secondary hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          Directorio ({graduates.length})
        </button>

        {isGraduate && (
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all relative whitespace-nowrap ${
              activeTab === 'connections'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Mis Conexiones ({connections.accepted.length})
            {connections.incoming.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {connections.incoming.length} nueva{connections.incoming.length > 1 ? 's' : ''}
              </span>
            )}
          </button>
        )}

        {isGraduate && (
          <button
            onClick={() => setActiveTab('mentorships')}
            className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all relative whitespace-nowrap ${
              activeTab === 'mentorships'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            MentorÃ­as UPC
            {receivedRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {receivedRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* â”€â”€ TAB: SUGERENCIAS DE RED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'network' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              Egresados afines a tu perfil profesional, ordenados por similitud de carrera y habilidades.
            </p>
            <button
              onClick={fetchNetworkSuggestions}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1"
            >
              Actualizar sugerencias
            </button>
          </div>

          {loadingNetwork ? (
            <div className="py-16 text-center text-sm text-ink-tertiary">
              Calculando perfiles afines...
            </div>
          ) : networkSuggestions.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-tertiary">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-ink">No hay sugerencias disponibles</p>
              <p className="text-xs mt-1">Completa tu perfil con habilidades y programa acadÃ©mico para recibir sugerencias.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {networkSuggestions.map((s) => {
                const initials = s.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
                const affinityPct = Math.min(Math.round((s.affinity_score / 95) * 100), 100);
                return (
                  <div
                    key={s.user_id}
                    className="rounded-2xl border p-4 shadow-xs flex flex-col gap-3 transition-all hover:shadow-md"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    {/* Avatar + Info */}
                    <div className="flex items-start gap-3">
                      {s.profile_picture_url ? (
                        <img
                          src={s.profile_picture_url}
                          alt={s.full_name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border"
                          style={{ borderColor: 'var(--border-color)' }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink truncate">{s.full_name}</p>
                        {s.headline && (
                          <p className="text-xs text-ink-secondary line-clamp-2 mt-0.5">{s.headline}</p>
                        )}
                        {s.graduation_year && (
                          <p className="text-[10px] text-ink-tertiary mt-0.5">PromociÃ³n {s.graduation_year}</p>
                        )}
                      </div>
                    </div>

                    {/* Skills badges */}
                    {s.skills && s.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.skills.slice(0, 3).map((sk: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-ink-secondary"
                          >
                            {sk}
                          </span>
                        ))}
                        {s.skills.length > 3 && (
                          <span className="text-[10px] text-ink-tertiary px-1 py-0.5">+{s.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Affinity badge */}
                    {s.affinity_score > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${affinityPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-brand-600">{affinityPct}% afÃ­n</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        onClick={() => handleOpenPublicProfile(s.user_id)}
                        className="flex-1 py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 hover:bg-muted transition-all"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      >
                        <Eye className="w-3 h-3 text-brand-600" />
                        Ver perfil
                      </button>

                      {s.connection_status === 'NONE' ? (
                        <button
                          onClick={() => setConnectModalUser({ user_id: s.user_id, full_name: s.full_name, first_name: s.full_name?.split(' ')[0], last_name: s.full_name?.split(' ').slice(1).join(' '), program_name: '' })}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center gap-1 transition-all shadow-xs"
                        >
                          <UserPlus className="w-3 h-3" />
                          Conectar
                        </button>
                      ) : s.connection_status === 'PENDING' ? (
                        <span className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-muted text-ink-tertiary flex items-center justify-center gap-1 text-center">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      ) : s.connection_status === 'ACCEPTED' ? (
                        <span className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center justify-center gap-1 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Conectado
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ TAB 1: DIRECTORIO DE EGRESADOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'directory' && (
        <>
          {/* Filtros superiores */}
          <div 
            className="p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row items-center gap-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
              <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, cargo, empresa o competencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">AÃ±o de GraduaciÃ³n: Todos</option>
                {Array.from({ length: 15 }, (_, i) => 2026 - i).map((y) => (
                  <option key={y} value={y}>
                    PromociÃ³n {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setMentorsOnly(!mentorsOnly)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border flex items-center gap-2 transition-all ${
                  mentorsOnly
                    ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'bg-transparent text-ink-secondary border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Solo Mentores</span>
              </button>
            </div>
          </div>

          {/* Grid de Egresados */}
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-tertiary">
              Cargando red de egresados...
            </div>
          ) : graduates.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-tertiary">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-ink">No se encontraron egresados con los filtros seleccionados</p>
              <p className="text-xs mt-1">Intenta con otros tÃ©rminos o elimina el filtro de aÃ±o.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {graduates.map((g) => {
                const isMe = g.user_id === currentUser?.id;
                const isMentor = g.mentor_opt_in;
                const initials = `${g.first_name?.[0] || ''}${g.last_name?.[0] || ''}`.toUpperCase();

                return (
                  <div
                    key={g.user_id}
                    className="rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden group"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    {isMentor && (
                      <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        <span>Mentor UPC</span>
                      </div>
                    )}

                    <div>
                      {/* Avatar y Datos Principales */}
                      <div className="flex items-start gap-4">
                        {g.profile_picture_url ? (
                          <img
                            src={g.profile_picture_url}
                            alt={g.first_name}
                            className="w-14 h-14 rounded-2xl object-cover border"
                            style={{ borderColor: 'var(--border-color)' }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-ink truncate">
                            {g.first_name} {g.last_name}
                          </h3>
                          <p className="text-xs text-ink-secondary flex items-center gap-1 mt-0.5">
                            <GraduationCap className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                            <span className="truncate">{g.program_name} â€¢ {g.graduation_year}</span>
                          </p>
                          {(g.current_position || g.current_company) && (
                            <p className="text-xs text-ink-secondary flex items-center gap-1 mt-1 font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0" />
                              <span className="truncate">
                                {g.current_position || 'Profesional'} {g.current_company ? `en ${g.current_company}` : ''}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bio / Headline */}
                      {g.mentor_profile?.headline ? (
                        <p className="text-xs italic text-ink mt-3 font-medium bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-lg border border-purple-100 dark:border-purple-900/30">
                          "{g.mentor_profile.headline}"
                        </p>
                      ) : g.profile_summary ? (
                        <p className="text-xs text-ink-secondary mt-3 line-clamp-2">
                          {g.profile_summary}
                        </p>
                      ) : null}

                      {/* Skills Tags */}
                      {g.skills && g.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {g.skills.slice(0, 4).map((sk: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-ink-secondary"
                            >
                              {sk}
                            </span>
                          ))}
                          {g.skills.length > 4 && (
                            <span className="text-[10px] text-ink-tertiary px-1 py-0.5">
                              +{g.skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Acciones del Card */}
                    <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        onClick={() => handleOpenPublicProfile(g.user_id)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 hover:bg-muted transition-all"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                        <span>Ver Perfil & Proyectos</span>
                      </button>

                      {!isMe && isGraduate && (
                        <button
                          onClick={() => setConnectModalUser(g)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center gap-1 transition-all shadow-xs"
                          title="Enviar solicitud de conexiÃ³n"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Conectar</span>
                        </button>
                      )}

                      {!isMe && isMentor && (
                        <button
                          onClick={() => setRequestModalMentor(g)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                          title="Solicitar mentorÃ­a"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ TAB 2: MIS CONEXIONES Y CONTACTOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'connections' && (
        <div className="space-y-8">
          {/* 1. Solicitudes Recibidas */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Solicitudes de ConexiÃ³n Recibidas ({connections.incoming.length})
            </h2>
            {connections.incoming.length === 0 ? (
              <p className="text-sm text-ink-tertiary italic">No tienes solicitudes pendientes por responder.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border shadow-xs space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-start gap-3">
                      {req.peer_picture_url ? (
                        <img src={req.peer_picture_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                          {req.peer_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-ink">{req.peer_name}</h4>
                        <p className="text-xs text-ink-secondary">{req.peer_program}</p>
                        {req.message && (
                          <p className="text-xs text-ink-tertiary bg-muted p-2 rounded-lg mt-2 italic">
                            "{req.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        onClick={() => handleRespondConnection(req.id, 'ACCEPT')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar ConexiÃ³n
                      </button>
                      <button
                        onClick={() => handleRespondConnection(req.id, 'REJECT')}
                        className="px-3 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Mis Contactos Conectados */}
          <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-600" />
              Contactos en tu Red ({connections.accepted.length})
            </h2>
            {connections.accepted.length === 0 ? (
              <p className="text-sm text-ink-tertiary italic">
                AÃºn no tienes egresados conectados. Visita el Directorio y envÃ­a solicitudes para expandir tu red profesional.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.accepted.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-start gap-3">
                      {c.peer_picture_url ? (
                        <img src={c.peer_picture_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                          {c.peer_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-ink truncate">{c.peer_name}</h4>
                        <p className="text-xs text-ink-secondary truncate">{c.peer_program}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                          <CheckCircle2 className="w-3 h-3" /> Conectados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        onClick={() => handleOpenPublicProfile(c.peer_id)}
                        className="flex-1 py-1.5 border rounded-xl text-xs font-semibold hover:bg-muted"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      >
                        Ver Perfil
                      </button>
                      <button
                        onClick={() => navigate('/messages')}
                        className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Enviar Mensaje
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Solicitudes Enviadas Pendientes */}
          <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-600" />
              Solicitudes Enviadas Pendientes ({connections.sent.length})
            </h2>
            {connections.sent.length === 0 ? (
              <p className="text-sm text-ink-tertiary italic">No tienes solicitudes pendientes de respuesta.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.sent.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border shadow-xs flex items-center justify-between"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-ink">{s.peer_name}</h4>
                      <p className="text-[11px] text-ink-secondary">{s.peer_program}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                      En espera de aprobaciÃ³n
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ TAB 3: MIS MENTORÃAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'mentorships' && (
        <div className="space-y-8">
          {/* Solicitudes Recibidas (Como mentor) */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Solicitudes Recibidas como Mentor ({receivedRequests.length})
            </h2>
            {receivedRequests.length === 0 ? (
              <p className="text-sm text-ink-tertiary italic">No has recibido solicitudes de mentorÃ­a por el momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedRequests.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl border shadow-xs space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ink">{r.mentee_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {r.status === 'PENDING' ? 'Pendiente' : r.status === 'ACCEPTED' ? 'Aceptada' : 'Rechazada'}
                      </span>
                    </div>
                    {r.goal && (
                      <p className="text-xs text-brand-600 font-semibold">
                        Objetivo: {r.goal}
                      </p>
                    )}
                    <p className="text-xs text-ink-secondary bg-muted p-3 rounded-xl italic">
                      "{r.message}"
                    </p>

                    {r.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'ACCEPTED')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aceptar MentorÃ­a
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                          className="px-3 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : r.status === 'ACCEPTED' ? (
                      <button
                        onClick={() => navigate('/messages')}
                        className="w-full py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Ir al Chat
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solicitudes Enviadas (Como mentee) */}
          <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-600" />
              Solicitudes que Has Enviado ({sentRequests.length})
            </h2>
            {sentRequests.length === 0 ? (
              <p className="text-sm text-ink-tertiary italic">No has enviado solicitudes de mentorÃ­a aÃºn.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentRequests.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl border shadow-xs space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ink">Mentor: {r.mentor_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        r.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {r.status === 'PENDING' ? 'En espera de respuesta' : r.status === 'ACCEPTED' ? 'Aceptada' : 'No disponible'}
                      </span>
                    </div>
                    {r.goal && (
                      <p className="text-xs text-brand-600 font-semibold">
                        Objetivo: {r.goal}
                      </p>
                    )}
                    <p className="text-xs text-ink-secondary bg-muted p-3 rounded-xl italic">
                      "{r.message}"
                    </p>
                    {r.status === 'ACCEPTED' && (
                      <button
                        onClick={() => navigate('/messages')}
                        className="w-full py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Abrir ConversaciÃ³n con tu Mentor
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: PERFIL PÃšBLICO & PORTAFOLIO DE PROYECTOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedProfileUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div 
            className="w-full max-w-3xl my-8 rounded-3xl border shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            {loadingProfile || !publicProfile ? (
              <div className="py-20 text-center text-sm text-ink-tertiary">
                Cargando perfil pÃºblico y portafolio...
              </div>
            ) : (
              <>
                {/* Header del Perfil */}
                <div className="flex items-start justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-start gap-4">
                    {publicProfile.profile_picture_url ? (
                      <img
                        src={publicProfile.profile_picture_url}
                        alt=""
                        className="w-20 h-20 rounded-2xl object-cover border-2 shadow-sm"
                        style={{ borderColor: 'var(--border-color)' }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-brand-100 text-brand-700 font-bold text-2xl flex items-center justify-center">
                        {publicProfile.first_name?.[0]}
                        {publicProfile.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-ink">
                          {publicProfile.first_name} {publicProfile.last_name}
                        </h2>
                        <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Egresado UPC Verificado
                        </span>
                      </div>
                      <p className="text-sm text-brand-600 font-semibold mt-0.5">
                        {publicProfile.program_name} â€¢ PromociÃ³n {publicProfile.graduation_year}
                      </p>
                      {publicProfile.profile_summary && (
                        <p className="text-xs text-ink-secondary mt-2 max-w-xl">
                          {publicProfile.profile_summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedProfileUserId(null);
                      setPublicProfile(null);
                    }}
                    className="p-1.5 rounded-xl border text-ink-tertiary hover:text-ink"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Portafolio de Proyectos Destacados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-brand-600" />
                      Proyectos y Portafolio Profesional ({publicProfile.projects?.length || 0})
                    </h3>
                  </div>

                  {(!publicProfile.projects || publicProfile.projects.length === 0) ? (
                    <div className="p-6 rounded-2xl border text-center text-xs text-ink-tertiary" style={{ borderColor: 'var(--border-color)' }}>
                      El egresado aÃºn no ha registrado proyectos pÃºblicos en su portafolio.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {publicProfile.projects.map((proj: any) => {
                        const resInfo = proj.resource_type ? resourceTypeInfo[proj.resource_type] : null;
                        return (
                          <div
                            key={proj.id}
                            className="p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {resInfo && (
                                  <span className="text-base" title={resInfo.label}>{resInfo.emoji}</span>
                                )}
                                <h4 className="text-sm font-bold text-ink">{proj.title}</h4>
                              </div>
                              {resInfo && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-ink-secondary mb-2 inline-block">
                                  {resInfo.label}
                                </span>
                              )}
                              <p className="text-xs text-ink-secondary mt-1 line-clamp-3">{proj.description}</p>
                              {proj.technologies && proj.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2.5">
                                  {(typeof proj.technologies === 'string' ? proj.technologies.split(',') : proj.technologies).map((t: string, idx: number) => (
                                    <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-ink-secondary">
                                      {t.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                              {(proj.resource_url || proj.project_url) && (
                                <a
                                  href={proj.resource_url || proj.project_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1 px-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <ExternalLink className="w-3 h-3" /> {resInfo ? resInfo.label : 'Ver recurso'}
                                </a>
                              )}
                              {proj.repository_url && (
                                <a
                                  href={proj.repository_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-muted"
                                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                  <GithubIcon className="w-3 h-3" /> Repositorio
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Habilidades & Competencias */}
                {publicProfile.skills && publicProfile.skills.length > 0 && (
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Habilidades TÃ©cnicas & Blandas</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {publicProfile.skills.map((s: string, idx: number) => (
                        <span key={idx} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Educacion Academica */}
                {publicProfile.academic_histories && publicProfile.academic_histories.length > 0 && (
                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-brand-600" /> Educacion Academica
                    </h3>
                    <div className="space-y-2">
                      {publicProfile.academic_histories.map((edu: any) => (
                        <div key={edu.id} className="p-3 rounded-xl border text-xs" style={{ borderColor: 'var(--border-color)' }}>
                          <p className="font-bold text-ink">{edu.degree}</p>
                          <p className="text-[11px] text-ink-secondary">{edu.institution}</p>
                          <p className="text-[11px] text-ink-tertiary">{edu.start_date} - {edu.end_date || 'Actualmente'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiencia Laboral */}
                {publicProfile.experiences && publicProfile.experiences.length > 0 && (
                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-brand-600" /> Experiencia Laboral
                    </h3>
                    <div className="space-y-2">
                      {publicProfile.experiences.map((exp: any) => (
                        <div key={exp.id} className="p-3 rounded-xl border text-xs" style={{ borderColor: 'var(--border-color)' }}>
                          <p className="font-bold text-ink">{exp.position} en {exp.company_name}</p>
                          <p className="text-[11px] text-ink-secondary">{exp.start_date} - {exp.end_date || 'Actualmente'}</p>
                          {exp.description && <p className="text-xs text-ink-secondary mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones de AcciÃ³n / Estado de ConexiÃ³n en Modal */}
                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    {publicProfile.connection_status === 'SELF' ? (
                      <span className="text-xs text-ink-tertiary italic">Este es tu perfil institucional</span>
                    ) : publicProfile.connection_status === 'ACCEPTED' ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Â¡EstÃ¡n conectados en la red!
                      </span>
                    ) : publicProfile.connection_status === 'PENDING' ? (
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Solicitud de conexiÃ³n pendiente
                      </span>
                    ) : (
                      <span className="text-xs text-ink-secondary">
                        Conecta para compartir oportunidades y comunicarte directamente.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {publicProfile.connection_status === 'ACCEPTED' ? (
                      <button
                        onClick={() => {
                          setSelectedProfileUserId(null);
                          navigate('/messages');
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Enviar Mensaje Directo</span>
                      </button>
                    ) : publicProfile.connection_status === 'PENDING' ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-5 py-2.5 bg-muted text-ink-tertiary rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Solicitud Enviada</span>
                      </button>
                    ) : publicProfile.connection_status !== 'SELF' && isGraduate ? (
                      <button
                        onClick={() => {
                          setConnectModalUser(publicProfile);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Conectar & Chatear</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL: ENVIAR SOLICITUD DE CONEXIÃ“N / AMISTAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {connectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-base font-bold text-ink">Conectar con Egresado</h3>
                <p className="text-xs text-ink-secondary">
                  {connectModalUser.first_name || connectModalUser.full_name} {connectModalUser.last_name || ''} {connectModalUser.program_name ? `(${connectModalUser.program_name})` : ''}
                </p>
              </div>
              <button 
                onClick={() => setConnectModalUser(null)}
                className="p-1 rounded-lg text-ink-tertiary hover:text-ink"
              >
                âœ•
              </button>
            </div>

            <p className="text-xs text-ink-secondary">
              Al conectar, ambos podrÃ¡n ver sus portafolios de proyectos y conversar en tiempo real mediante <strong>MensajerÃ­a Directa</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Mensaje o Nota de Saludo (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Hola! Me gustarÃ­a conectar contigo para compartir oportunidades y experiencias profesionales..."
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConnectModalUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border"
                style={{ borderColor: 'var(--border-color)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sendingConnect}
                onClick={() => handleSendConnection(connectModalUser.user_id, connectNote)}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingConnect ? 'Enviando...' : 'Enviar Solicitud'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar MentorÃ­a */}
      {requestModalMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-lg font-bold text-ink">Solicitar MentorÃ­a</h3>
                <p className="text-xs text-ink-secondary">
                  A {requestModalMentor.first_name} {requestModalMentor.last_name} ({requestModalMentor.program_name})
                </p>
              </div>
              <button 
                onClick={() => setRequestModalMentor(null)}
                className="p-1 rounded-lg text-ink-tertiary hover:text-ink"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleSendMentorshipRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Objetivo o Meta de la MentorÃ­a (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: OrientaciÃ³n para conseguir mi primer empleo como desarrollador"
                  value={requestGoal}
                  onChange={(e) => setRequestGoal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Mensaje de PresentaciÃ³n *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="CuÃ©ntale al mentor sobre ti, tu trayectoria acadÃ©mica y por quÃ© te gustarÃ­a recibir su guÃ­a..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalMentor(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingRequest ? 'Enviando...' : 'Enviar Solicitud'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configurar Perfil de Mentor */}
      {mentorConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Tu Perfil de Mentor UPC
                </h3>
                <p className="text-xs text-ink-secondary">
                  Comparte tu experiencia laboral y guÃ­a a egresados reciÃ©n graduados.
                </p>
              </div>
              <button 
                onClick={() => setMentorConfigOpen(false)}
                className="p-1 rounded-lg text-ink-tertiary hover:text-ink"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleSaveMentorProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Titular Profesional / Enfoque
                </label>
                <input
                  type="text"
                  placeholder="Ej: Senior Software Engineer | Especialista en inserciÃ³n tecnolÃ³gica"
                  value={mentorHeadline}
                  onChange={(e) => setMentorHeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Ãreas de Experiencia (separadas por coma)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Desarrollo Web, Entrevistas TÃ©cnicas, Liderazgo, Sector Salud"
                  value={mentorAreas}
                  onChange={(e) => setMentorAreas(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Breve BiografÃ­a para Mentees
                </label>
                <textarea
                  rows={3}
                  placeholder="Comparte cÃ³mo puedes apoyar a tus compaÃ±eros egresados..."
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMentorConfigOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMentor}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>{savingMentor ? 'Guardando...' : 'Activar Perfil de Mentor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
