import React, { type ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  UserCircle,
  ClipboardList,
  CheckCircle,
  Users,
  FileText,
  GraduationCap,
  Search,
  Settings,
  Menu,
  MapPin,
  Trophy,
  Sparkles,
  ShieldAlert,
  KeyRound,
  BarChart3,
  Calendar,
  MessageSquare,
  X,
  FolderGit2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Loader2
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import NotificationsBell from './NotificationsBell';
import Modal from './Modal';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import {
  authApi,
  graduatesApi,
  getAuthNotifications,
  getNotifications,
  getPublicPrograms,
  resubmitGraduateVerification,
} from '../api';

interface LayoutProps {
  children: ReactNode;
}

const getNavItems = (role: string) => {
  const allItems = [
    // Module Admin
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Egresados',
      path: '/admin/graduates',
      icon: Users,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Verificación Egresados',
      path: '/coordinator/verifications',
      icon: ShieldCheck,
      roles: ['ADMIN', 'COORDINATOR'],
      section: role === 'COORDINATOR' ? 'Coordinación UPC' : 'Administración Global',
    },
    {
      name: 'Encuestas Seguimiento',
      path: '/admin/surveys',
      icon: ClipboardList,
      roles: ['ADMIN', 'COORDINATOR'],
      section: role === 'COORDINATOR' ? 'Coordinación UPC' : 'Administración Global',
    },
    {
      name: 'Reporte Postulaciones',
      path: '/admin/applications',
      icon: FileText,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Matchmaking',
      path: '/admin/matchmaking',
      icon: Settings,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Gestión Usuarios',
      path: '/admin/users',
      icon: Users,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Sectores Emp.',
      path: '/admin/sectors',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Gestión Ciudades',
      path: '/admin/cities',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Gestión Programas',
      path: '/admin/programs',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Analítica BI Ejecutiva',
      path: '/admin/analytics',
      icon: BarChart3,
      roles: ['ADMIN'],
      section: 'Inteligencia Institucional',
    },
    {
      name: 'Mapa Calor Cohortes',
      path: '/cohorts',
      icon: Trophy,
      roles: ['ADMIN', 'GRADUATE'],
      section: 'Inteligencia Institucional',
    },

    {
      name: 'Dashboard',
      path: '/company/dashboard',
      icon: LayoutDashboard,
      roles: ['COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: 'Copiloto IA Reclutamiento',
      path: '/company-copilot',
      icon: Sparkles,
      roles: ['ADMIN', 'COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: role === 'COMPANY' ? 'Mi Perfil Empresarial' : 'Empresas Aliadas',
      path: '/companies',
      icon: Building2,
      roles: ['ADMIN', 'COMPANY'],
      section: 'Módulo Empresas',
    },

    {
      name: 'Vacantes Activas',
      path: '/job-offers',
      icon: Briefcase,
      roles: ['ADMIN', 'COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: 'Candidatos',
      path: '/kanban',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'COMPANY'],
      section: 'Módulo Empresas',
    },

    {
      name: 'Dashboard',
      path: '/graduate/dashboard',
      icon: LayoutDashboard,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Copiloto IA Perfil',
      path: '/copilot',
      icon: Sparkles,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Datos Personales',
      path: '/profile',
      icon: UserCircle,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Experiencia Laboral',
      path: '/experience',
      icon: Briefcase,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Proyectos & Portafolio',
      path: '/projects',
      icon: FolderGit2,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Historial Académico',
      path: '/education',
      icon: GraduationCap,
      roles: ['GRADUATE'],
      section: 'Módulo Egresado',
    },
    {
      name: 'Explorar Vacantes',
      path: '/jobs',
      icon: Search,
      roles: ['GRADUATE'],
      section: 'Empleabilidad',
    },
    {
      name: 'Recomendaciones',
      path: '/matchmaking',
      icon: Sparkles,
      roles: ['GRADUATE'],
      section: 'Empleabilidad',
    },
    {
      name: 'Mis Postulaciones',
      path: '/applications',
      icon: CheckCircle,
      roles: ['GRADUATE'],
      section: 'Empleabilidad',
    },
    {
      name: 'Seguimiento M01',
      path: '/surveys',
      icon: ClipboardList,
      roles: ['GRADUATE'],
      section: 'Institucional',
    },

    // Módulo Comunidad, Red y Eventos
    {
      name: 'Mi Red / Network',
      path: '/network',
      icon: Users,
      roles: ['GRADUATE', 'ADMIN', 'COMPANY'],
      section: 'Comunidad & Red',
    },
    {
      name: 'Eventos y Ferias',
      path: '/events',
      icon: Calendar,
      roles: ['GRADUATE', 'COMPANY', 'ADMIN'],
      section: 'Comunidad & Red',
    },
    {
      name: 'Mensajería Directa',
      path: '/messages',
      icon: MessageSquare,
      roles: ['GRADUATE', 'COMPANY', 'ADMIN'],
      section: 'Comunidad & Red',
    },
  ];

  return allItems.filter((item) => item.roles.includes(role));
};



export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const pageTitles: Record<string, string> = {
    '/admin/dashboard': 'Dashboard Administrativo',
    '/coordinator/verifications': 'Verificación Académica de Egresados · Coordinación UPC',
    '/admin/surveys': 'Gestión de Encuestas de Seguimiento (MEN / OLE / CNA)',
    '/admin/analytics': 'Analítica BI Ejecutiva (Estilo Power BI)',
    '/company/dashboard': 'Dashboard Empresa',
    '/graduate/dashboard': 'Dashboard Egresado',
    '/companies': 'Directorio de Empresas',
    '/job-offers': 'Ofertas Laborales',
    '/kanban': 'Gestión de Candidatos',
    '/profile': 'Mi Perfil Profesional',
    '/projects': 'Portafolio de Proyectos & Trabajo Profesional',
    '/jobs': 'Explorar Ofertas Laborales',
    '/directory': 'Directorio de Egresados & Mentorías',
    '/network': 'Mi Red Profesional & Network',
    '/events': 'Eventos, Ferias y Convocatorias',
    '/messages': 'Mensajería Directa y Red de Contactos',
    '/copilot': 'Copiloto IA del Egresado (Groq LLM)',
    '/company-copilot': 'Copiloto IA de Reclutamiento · Empresas',
    '/cohorts': 'Mapa de Calor de Empleabilidad y Salarios por Cohorte',
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  const [loginAlerts, setLoginAlerts] = useState<any[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Estado en vivo de verificación académica del egresado (Fase 6)
  const [verificationStatus, setVerificationStatus] = useState<string>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.verification_status || 'APPROVED';
    } catch {
      return 'APPROVED';
    }
  });
  const [verificationNotes, setVerificationNotes] = useState<string | null>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.verification_notes || null;
    } catch {
      return null;
    }
  });
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitSaving, setResubmitSaving] = useState(false);
  const [programsList, setProgramsList] = useState<{ id: number; name: string }[]>([]);
  const [resubmitForm, setResubmitForm] = useState({
    first_name: '',
    last_name: '',
    document_id: '',
    program_id: 1,
    graduation_year: new Date().getFullYear(),
    degree_act_number: '',
    diploma_number: '',
    phone: '',
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  const roleName = user?.role_name || '';
  const navItems = getNavItems(roleName);

  // Notificaciones en Tiempo Real (WebSocket en ALB/Fargate/EC2 o Polling ligero en AWS API Gateway + Lambda)
  useEffect(() => {
    if (!user || !user.id) return;

    const envUrl = import.meta.env.VITE_MATCHMAKING_URL;
    const baseUrl = (envUrl !== undefined && envUrl !== "") ? envUrl : window.location.origin;
    const isServerlessHttpApi = baseUrl.includes('.execute-api.');

    if (isServerlessHttpApi) {
      if (user.role_name !== 'GRADUATE') return;
      const seenIds = new Set<number>();
      let firstLoad = true;
      const pollMatches = () => {
        getNotifications(user.id, true)
          .then((res) => {
            const items = res.data || [];
            items.forEach((n) => {
              if (!seenIds.has(n.id)) {
                seenIds.add(n.id);
                if (!firstLoad) {
                  toast.success(`¡Nueva vacante sugerida! Compatibilidad: ${n.score}%`, {
                    icon: '✨',
                    duration: 5000,
                  });
                }
              }
            });
            firstLoad = false;
          })
          .catch(() => {});
      };
      pollMatches();
      const timer = setInterval(pollMatches, 30000);
      return () => clearInterval(timer);
    }

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const connectWs = () => {
      const wsUrl = baseUrl.replace('http', 'ws') + `/matching/ws/${user.id}`;
      
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_MATCH') {
            toast.success(`¡Nueva vacante sugerida! Compatibilidad: ${data.score}%`, {
              icon: '✨',
              duration: 5000,
            });
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      ws.onclose = () => {
        // Retry connection after 5 seconds
        reconnectTimer = setTimeout(connectWs, 5000);
      };
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role_name !== 'GRADUATE') return;
    getAuthNotifications()
      .then((res) => {
        const unread = res.data?.filter((n: any) => !n.is_read) || [];
        if (unread.length > 0) {
          setLoginAlerts(unread);
        }
      })
      .catch(() => {});

    // Sincronizar estado de verificación académica desde Auth y ficha de Egresados
    authApi
      .get('/me')
      .then((res) => {
        const fresh = res.data;
        if (fresh?.verification_status) {
          setVerificationStatus(fresh.verification_status);
          setVerificationNotes(fresh.verification_notes || null);
          const merged = { ...user, ...fresh };
          localStorage.setItem('user', JSON.stringify(merged));
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const openResubmitVerificationModal = async () => {
    setShowResubmitModal(true);
    try {
      const [progsRes, profRes] = await Promise.all([
        getPublicPrograms().catch(() => ({ data: [] as { id: number; name: string }[] })),
        graduatesApi.get('/profile').catch(() => ({ data: null as any })),
      ]);
      if (Array.isArray(progsRes.data) && progsRes.data.length > 0) {
        setProgramsList(progsRes.data);
      }
      const p = profRes.data;
      if (p) {
        setResubmitForm({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          document_id: p.document_id || '',
          program_id: p.program_id || 1,
          graduation_year: p.graduation_year || new Date().getFullYear(),
          degree_act_number: p.degree_act_number || '',
          diploma_number: p.diploma_number || '',
          phone: p.phone || '',
        });
      }
    } catch {
      // ignore
    }
  };

  const handleResubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitForm.document_id.trim()) {
      toast.error('Ingresa tu número de cédula.');
      return;
    }
    if (!resubmitForm.degree_act_number.trim() && !resubmitForm.diploma_number.trim()) {
      toast.error('Ingresa tu número de acta de grado o número de diploma.');
      return;
    }
    try {
      setResubmitSaving(true);
      await resubmitGraduateVerification({
        ...resubmitForm,
        document_id: resubmitForm.document_id.trim(),
        degree_act_number: resubmitForm.degree_act_number.trim() || undefined,
        diploma_number: resubmitForm.diploma_number.trim() || undefined,
        phone: resubmitForm.phone.trim() || undefined,
      });
      setVerificationStatus('PENDING_VERIFICATION');
      setVerificationNotes(null);
      if (user) {
        localStorage.setItem(
          'user',
          JSON.stringify({ ...user, verification_status: 'PENDING_VERIFICATION', verification_notes: null })
        );
      }
      setShowResubmitModal(false);
      toast.success('Datos de grado actualizados y enviados nuevamente a Coordinación UPC.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo reenviar la verificación.');
    } finally {
      setResubmitSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('user');

    navigate('/login', { replace: true });
  };

  const isImpersonating = !!localStorage.getItem('adminToken');

  const handleReturnToAdmin = () => {
    const originalToken = localStorage.getItem('adminToken');
    const originalUser = localStorage.getItem('adminUser');

    if (originalToken && originalUser) {
      localStorage.setItem('access_token', originalToken);
      localStorage.setItem('user', originalUser);

      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');

      window.location.href = '/admin/graduates';
    }
  };

  const currentTitle =
    pageTitles[location.pathname] ??
    (roleName === 'COMPANY'
      ? 'Portal Empresa'
      : roleName === 'GRADUATE'
        ? 'Portal Egresado'
        : 'Portal Administrativo');

  const currentNavItem = navItems.find((item) => item.path === location.pathname);
  const CurrentIcon = currentNavItem?.icon;

  return (
    <div
      className="h-screen flex font-sans p-4 overflow-hidden" 
      style={{
        backgroundColor: 'var(--bg-main)',
      }}
    >

      {/* =========================================================
          SIDEBAR FLOTANTE
          ========================================================= */}
      <aside
        className={twMerge(
          `
          relative
          flex
          flex-col
          z-30
          rounded-3xl
          overflow-hidden
          transition-all
          duration-300
          shadow-lg shadow-black/5
          h-full
          `,
          isSidebarOpen ? 'w-[252px]' : 'w-[80px]'
        )}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)'
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute top-0 left-0 w-full h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top left, var(--accent-primary), transparent)',
            opacity: 0.15
          }}
        />

        {/* Logo */}
        <div
          className="
            h-[68px]
            flex
            items-center
            gap-3
            px-5
            flex-shrink-0
            relative
            z-10
          "
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="UPC"
              className="w-8 h-8 object-contain"
            />
          </div>

          <div
            className={twMerge(
              "leading-tight min-w-0 transition-all duration-300 overflow-hidden",
              isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}
          >
            <span className="block text-[13px] font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              Portal Empleo
            </span>

            <span className="block text-[9px] font-medium" style={{ color: 'var(--text-ink-secondary)' }}>
              Universidad UPC
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="px-5">
           <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* =====================================================
            NAVIGATION
            ===================================================== */}
        <nav
          className="
            flex-1
            px-3
            pt-4
            pb-2
            space-y-1
            relative
            z-10
            overflow-y-auto
            scrollbar-hide
          "
        >
          {(() => {
            let lastSection = '';

            return navItems.map(
              ({ name, path, icon: Icon, section }) => {
                const active =
                  location.pathname === path.split('?')[0];

                const showSection = section !== lastSection;

                lastSection = section || '';

                return (
                  <div key={path}>
                    {showSection && section && (
                      <div className={twMerge(
                        "overflow-hidden transition-all duration-300",
                        isSidebarOpen ? "opacity-100 max-h-10 mt-5 mb-2" : "opacity-0 max-h-0 mt-0 mb-0"
                      )}>
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            px-3
                            whitespace-nowrap
                          "
                          style={{
                            color: 'var(--text-ink-tertiary)',
                            letterSpacing: '0.12em',
                          }}
                        >
                          {section}
                        </p>
                      </div>
                    )}

                    <Link
                      to={path}
                      className={twMerge(
                        `
                        flex
                        items-center
                        px-3
                        py-2.5
                        rounded-xl
                        text-[13px]
                        font-medium
                        transition-all
                        duration-200
                        group
                        relative
                        `,
                        active
                          ? 'shadow-sm'
                          : ''
                      )}
                      style={{
                        backgroundColor: active
                          ? 'var(--accent-primary)'
                          : 'transparent',

                        color: active
                          ? 'var(--text-inverse)'
                          : 'var(--text-ink-secondary)',
                      }}
                    >
                      <Icon
                        className="
                          w-[18px]
                          h-[18px]
                          flex-shrink-0
                        "
                        style={{
                          color: active
                            ? 'var(--text-inverse)'
                            : 'var(--text-ink-tertiary)',
                        }}
                      />

                      <span
                        className={twMerge(
                          "whitespace-nowrap overflow-hidden transition-all duration-300",
                          isSidebarOpen ? "opacity-100 w-auto ml-3 flex-1 truncate" : "opacity-0 w-0 ml-0 flex-none"
                        )}
                      >
                        {name}
                      </span>
                    </Link>
                  </div>
                );
              }
            );
          })()}
        </nav>

        {/* =====================================================
            USER FOOTER
            ===================================================== */}
        <div className="p-4 flex-shrink-0 relative z-10">
          <div
            className={twMerge(
              "flex flex-col rounded-2xl mb-1 transition-all duration-300 overflow-hidden",
              isSidebarOpen ? "p-3 gap-3" : "p-0 h-0 opacity-0"
            )}
            style={{
              backgroundColor: 'var(--bg-muted)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-8
                  h-8
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  text-white
                  text-[13px]
                  font-bold
                  flex-shrink-0
                "
                style={{
                  background: 'var(--accent-primary)',
                }}
              >
                {user?.email?.[0]?.toUpperCase() ?? (
                  <UserCircle className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                  {user?.email ?? 'Usuario'}
                </p>

                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                  "
                  style={{
                    color: 'var(--text-ink-tertiary)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {roleName}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg text-[11px] font-bold text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> {'Cerrar Sesión'}
            </button>
          </div>
          
          {/* Collapsed logout icon */}
          {!isSidebarOpen && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-red-300 hover:bg-red-500/10 transition-colors mt-2"
              title={'Cerrar Sesión'}
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================
          CONTENIDO PRINCIPAL
          ========================================================= */}
      <div
        className="
          flex-1
          flex
          flex-col
          min-w-0
          h-full
          pl-4
          transition-all
          duration-300
        "
      >
        {/* Background pattern */}
        <div
          className="
            absolute
            inset-0
            pointer-events-none
            z-0
          "
          style={{
            backgroundImage:
              'radial-gradient(var(--pattern-dot) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* =====================================================
            IMPERSONATION
            ===================================================== */}
        {isImpersonating && (
          <div
            className="
              bg-yellow-100
              text-yellow-800
              px-4
              py-2
              rounded-2xl
              mb-4
              text-sm
              font-bold
              flex
              items-center
              justify-between
              shadow-sm
              relative
              z-20
              flex-shrink-0
            "
          >
            <span>
              {'Estás actuando en nombre de este usuario.'}
            </span>

            <button
              onClick={handleReturnToAdmin}
              className="
                bg-yellow-200
                hover:bg-yellow-300
                px-3
                py-1
                rounded
                text-yellow-900
                transition-colors
              "
            >
              {'Volver a mi cuenta'}
            </button>
          </div>
        )}

        {/* =====================================================
            HEADER FLOTANTE
            ===================================================== */}
          <header
            className="
              h-[64px]
              rounded-3xl
              flex
              items-center
              px-6
              gap-4
              shadow-sm
              flex-shrink-0
              z-20
              mb-4
              transition-colors
              duration-300
            "
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 -ml-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-ink-secondary)' }}
              title={isSidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-3">
              <h1
                className="text-[15px] font-bold"
                style={{
                  color: 'var(--text-main)',
                }}
              >
                {currentTitle}
              </h1>
              
              {/* badge */}
              <span className="px-2.5 py-1 text-[9px] font-bold tracking-widest rounded-full uppercase" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
                 {roleName === 'ADMIN'
                   ? 'ADMINISTRACIÓN'
                   : roleName === 'COORDINATOR'
                     ? 'COORDINACIÓN UPC'
                     : roleName === 'COMPANY'
                       ? 'EMPRESA'
                       : 'EGRESADO'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}
                title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              <Link
                to="/account"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}
                title="Mi cuenta (contraseña y correo)"
              >
                <KeyRound className="w-4 h-4" />
              </Link>

              <Link
                to="/privacy-settings"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}
                title="Gestión de Privacidad (Habeas Data)"
              >
                <ShieldAlert className="w-4 h-4" />
              </Link>

              {(roleName === 'GRADUATE' || roleName === 'COORDINATOR') && <NotificationsBell />}

              {roleName === 'ADMIN' && (
                <Link
                  to="/admin/settings"
                  className="
                    w-8 h-8 flex items-center justify-center
                    rounded-full
                    transition-all
                    duration-200
                  "
                  style={{
                    backgroundColor: 'var(--bg-muted)',
                    color: 'var(--text-ink-secondary)',
                  }}
                  title={'Configuración'}
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
            </div>
          </header>

        {/* =====================================================
            PAGE CONTENT
            ===================================================== */}
        <main
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            relative
            z-10
            rounded-3xl
          "
        >
          <div
            className="
              w-full max-w-[1800px]
              mx-auto
              animate-fade-in
              pb-10
            "
          >
            {/* Banner de Estado de Verificación Académica (PENDING_VERIFICATION / REJECTED) */}
            {roleName === 'GRADUATE' && verificationStatus !== 'APPROVED' && (
              <div
                className={`mb-6 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                  verificationStatus === 'REJECTED'
                    ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:border-rose-800'
                    : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      verificationStatus === 'REJECTED'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    {verificationStatus === 'REJECTED' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {verificationStatus === 'REJECTED'
                        ? 'Observación de Coordinación UPC en tu verificación de título'
                        : 'Cuenta en revisión por Coordinación de Egresados UPC (PENDING_VERIFICATION)'}
                    </p>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                      {verificationStatus === 'REJECTED'
                        ? `Motivo reportado: "${verificationNotes || 'Verifica tu número de cédula y acta o diploma.'}" Corrige tus datos para reenviar la solicitud.`
                        : 'Puedes completar tu hoja de vida mientras el Coordinador valida tu cédula y acta/diploma. Postulaciones, encuestas oficiales, networking y mensajería directa se habilitarán automáticamente al aprobarse.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openResubmitVerificationModal}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                    verificationStatus === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {verificationStatus === 'REJECTED' ? 'Corregir y reenviar' : 'Ver / Actualizar acta'}
                </button>
              </div>
            )}

            {/* Modal para corregir o actualizar datos de verificación académica */}
            <Modal isOpen={showResubmitModal} onClose={() => setShowResubmitModal(false)} maxWidth="max-w-lg">
              <form onSubmit={handleResubmitVerification}>
                <div className="p-6 border-b border-[var(--border-color)]">
                  <h3 className="text-lg font-bold text-ink">Datos de Acreditación Académica UPC</h3>
                  <p className="text-xs text-ink-secondary mt-1">
                    Verifica que tus nombres, cédula, programa y número de acta o diploma coincidan con tu título oficial.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Nombres *</label>
                      <input
                        type="text"
                        required
                        value={resubmitForm.first_name}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, first_name: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={resubmitForm.last_name}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, last_name: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Cédula / Documento *</label>
                      <input
                        type="text"
                        required
                        value={resubmitForm.document_id}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, document_id: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Año de Grado *</label>
                      <input
                        type="number"
                        min={1976}
                        max={new Date().getFullYear() + 1}
                        required
                        value={resubmitForm.graduation_year}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, graduation_year: Number(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                  </div>
                  {programsList.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Programa Académico UPC *</label>
                      <select
                        value={resubmitForm.program_id}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, program_id: Number(e.target.value) })}
                        className="input w-full"
                      >
                        {programsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">N° Acta de Grado</label>
                      <input
                        type="text"
                        value={resubmitForm.degree_act_number}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, degree_act_number: e.target.value })}
                        placeholder="Ej. ACTA-2023-148"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">N° de Diploma</label>
                      <input
                        type="text"
                        value={resubmitForm.diploma_number}
                        onChange={(e) => setResubmitForm({ ...resubmitForm, diploma_number: e.target.value })}
                        placeholder="Ej. DIP-98412"
                        className="input w-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                    <button type="button" onClick={() => setShowResubmitModal(false)} className="btn-ghost">
                      Cancelar
                    </button>
                    <button type="submit" disabled={resubmitSaving} className="btn-primary inline-flex items-center gap-2">
                      {resubmitSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Enviar a Coordinación
                    </button>
                  </div>
                </div>
              </form>
            </Modal>

            {/* Banner de Alertas Notificaciones al Ingresar el Egresado */}
            {roleName === 'GRADUATE' && loginAlerts.length > 0 && !bannerDismissed && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-xl flex items-center justify-between gap-4 animate-fade-in border border-emerald-400/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm tracking-tight flex items-center gap-2">
                      ¡Tienes {loginAlerts.length} alerta{loginAlerts.length > 1 ? 's' : ''} activa{loginAlerts.length > 1 ? 's' : ''}!
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/50 uppercase font-black tracking-wider">
                        Nuevo
                      </span>
                    </p>
                    <p className="text-xs text-emerald-100 truncate mt-0.5">
                      {loginAlerts[0]?.title ? `${loginAlerts[0].title}: ` : ''}{loginAlerts[0]?.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/matchmaking"
                    className="px-4 py-2 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-all shadow-md active:scale-95"
                  >
                    Ver Oportunidades
                  </Link>
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                    title="Cerrar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
