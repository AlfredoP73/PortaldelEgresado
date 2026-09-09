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
  Sparkles
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import NotificationsBell from './NotificationsBell';
import { useTheme } from '../context/ThemeContext';

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
      name: 'Dashboard',
      path: '/company/dashboard',
      icon: LayoutDashboard,
      roles: ['COMPANY'],
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
  ];

  return allItems.filter((item) => item.roles.includes(role));
};



export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const pageTitles: Record<string, string> = {
    '/admin/dashboard': 'Dashboard Administrativo',
    '/company/dashboard': 'Dashboard Empresa',
    '/graduate/dashboard': 'Dashboard Egresado',
    '/companies': 'Directorio de Empresas',
    '/job-offers': 'Ofertas Laborales',
    '/kanban': 'Gestión de Candidatos',
    '/profile': 'Mi Perfil Profesional',
    '/jobs': 'Explorar Ofertas Laborales',
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  const roleName = user?.role_name || '';
  const navItems = getNavItems(roleName);

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
                 {roleName === 'ADMIN' ? 'ADMINISTRACIÓN' : (roleName === 'COMPANY' ? 'EMPRESA' : 'EGRESADO')}
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

              {roleName === 'GRADUATE' && <NotificationsBell />}

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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
