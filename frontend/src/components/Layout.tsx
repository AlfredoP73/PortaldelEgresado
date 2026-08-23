import { type ReactNode, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import NotificationsBell from './NotificationsBell';

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
      name: 'Directorio Egresados',
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
      name: 'Sectores',
      path: '/admin/sectors',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Ciudades',
      path: '/admin/cities',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },
    {
      name: 'Programas',
      path: '/admin/programs',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
      section: 'Administración Global',
    },

    // Module Companies
    {
      name: 'Dashboard',
      path: '/company/dashboard',
      icon: LayoutDashboard,
      roles: ['COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: role === 'COMPANY' ? 'Mi Perfil Empresarial' : 'Directorio Empresas',
      path: '/companies',
      icon: Building2,
      roles: ['ADMIN', 'COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: 'Directorio Egresados',
      path: '/talent-pool',
      icon: Users,
      roles: ['COMPANY'],
      section: 'Módulo Empresas',
    },
    {
      name: 'Vacantes',
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

    // Module Graduates
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

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
      className="h-screen flex font-sans" 
      style={{
        backgroundColor: 'var(--bg-main)',
      }}
    >

      {/* =========================================================
          SIDEBAR FIJO
          ========================================================= */}
      <aside
        className={twMerge(
          `
          fixed
          left-0
          top-0
          bottom-0
          flex
          flex-col
          z-30
          overflow-hidden
          transition-all
          duration-300
          `,
          isSidebarOpen ? 'w-[252px]' : 'w-[80px]'
        )}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute top-0 left-0 w-full h-28 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top left, rgba(34,168,110,0.15), transparent)',
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
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
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
            <p className="text-white font-bold text-[13px] truncate whitespace-nowrap">
              Portal Empleo
            </p>

            <p
              className="text-xs truncate whitespace-nowrap"
              style={{
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              Universidad UPC
            </p>
          </div>
        </div>

        {/* =====================================================
            NAVIGATION
            ===================================================== */}
        <nav
          className="
            flex-1
            px-3
            pt-5
            pb-2
            space-y-1
            relative
            z-10
            overflow-y-auto
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
                        isSidebarOpen ? "opacity-100 max-h-10 mt-4 mb-3" : "opacity-0 max-h-0 mt-0 mb-0"
                      )}>
                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            px-3
                            whitespace-nowrap
                          "
                          style={{
                            color: 'rgba(255,255,255,0.45)',
                            letterSpacing: '0.15em',
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
                        font-semibold
                        transition-all
                        duration-200
                        group
                        relative
                        `,
                        active
                          ? 'text-white'
                          : 'hover:text-white'
                      )}
                      style={{
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.1)'
                          : 'transparent',

                        color: active
                          ? '#fff'
                          : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <Icon
                        className="
                          w-[17px]
                          h-[17px]
                          flex-shrink-0
                        "
                        style={{
                          color: active
                            ? '#7cdaac'
                            : 'rgba(255,255,255,0.35)',
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

                      {active && isSidebarOpen && (
                        <ChevronRight
                          className="
                            w-3.5
                            h-3.5
                            opacity-50
                          "
                        />
                      )}

                      {active && (
                        <div
                          className="
                            absolute
                            left-0
                            top-1/2
                            -translate-y-1/2
                            w-[3px]
                            h-5
                            rounded-r-full
                          "
                          style={{
                            backgroundColor: '#7cdaac',
                          }}
                        />
                      )}
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
        <div
          className="p-3 flex-shrink-0"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            className={twMerge(
              "flex items-center rounded-xl mb-2 transition-all duration-300 overflow-hidden",
              isSidebarOpen ? "gap-2.5 px-2.5 py-2" : "gap-0 px-0 py-0 h-0"
            )}
            style={{
              backgroundColor: isSidebarOpen ? 'rgba(0,0,0,0.2)' : 'transparent',
            }}
          >
            <div
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-white
                text-sm
                font-bold
                flex-shrink-0
              "
              style={{
                background:
                  'linear-gradient(135deg, #158a58, #22a86e)',
              }}
            >
              {user?.email?.[0]?.toUpperCase() ?? (
                <UserCircle className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold truncate">
                {user?.email ?? 'Usuario'}
              </p>

              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                "
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.08em',
                }}
              >
                {roleName}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={twMerge(
              "w-full flex items-center justify-center rounded-xl text-[12px] font-semibold transition-all group overflow-hidden",
              isSidebarOpen ? "gap-2 px-4 py-2" : "gap-0 px-0 py-2 h-10 w-10 mx-auto"
            )}
            style={{
              color: 'rgba(252,165,165,0.7)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(239,68,68,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'transparent';
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />

            <span
              className={twMerge(
                "whitespace-nowrap overflow-hidden transition-all duration-300",
                isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
              )}
            >
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          CONTENIDO PRINCIPAL
          ========================================================= */}
      <div
        className={twMerge(
          `
          flex-1
          flex
          flex-col
          h-screen   
          overflow-hidden
          relative
          transition-all
          duration-300
          `,
          isSidebarOpen ? 'ml-[252px]' : 'ml-[80px]'
        )}
        style={{
          backgroundColor: 'var(--bg-main)',
        }}
      >
        {/* Background pattern */}
        <div
          className="
            fixed
            inset-0
            pointer-events-none
            z-0
            transition-all
            duration-300
          "
          style={{
            left: isSidebarOpen ? '252px' : '80px',
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
              Estás actuando en nombre de este usuario.
              Tienes todos sus permisos.
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
              Volver a Administrador
            </button>
          </div>
        )}

        {/* =====================================================
            HEADER FIJO
            ===================================================== */}
          <header
            className="
              h-[64px]
              flex
              items-center
              px-8
              gap-4
              flex-shrink-0
              z-20
              transition-colors
              duration-300
            "
            style={{
              backgroundColor: 'var(--bg-header)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 -ml-2 rounded-lg text-ink-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={isSidebarOpen ? "Colapsar menú" : "Expandir menú"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              {CurrentIcon && <CurrentIcon className="w-4 h-4 text-ink-secondary" />}
              <h1
                className="text-sm font-medium"
                style={{
                  color: 'var(--text-main)',
                }}
              >
                {currentTitle}
              </h1>
            </div>

            {roleName === 'GRADUATE' && <NotificationsBell />}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="
                p-2
                rounded-lg
                transition-all
                duration-200
              "
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </header>

        {/* =====================================================
            PAGE CONTENT
            ===================================================== */}
        <main
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            p-8
            relative
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
