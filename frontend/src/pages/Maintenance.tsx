import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  Building2, 
  Sparkles, 
  BarChart3, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Activity,
  Server,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

interface ServiceStatus {
  id: string;
  name: string;
  module: string;
  description: string;
  url: string;
  route: string;
  status: 'checking' | 'operational' | 'maintenance';
  latencyMs?: number;
  icon: any;
}

const AUTH_URL        = import.meta.env.VITE_AUTH_URL        ?? '';
const GRADUATES_URL   = import.meta.env.VITE_GRADUATES_URL   ?? '';
const COMPANIES_URL   = import.meta.env.VITE_COMPANIES_URL   ?? '';
const MATCHMAKING_URL = import.meta.env.VITE_MATCHMAKING_URL ?? '';
const DASHBOARD_URL   = import.meta.env.VITE_DASHBOARD_URL   ?? '';

export default function Maintenance() {
  const [checkingAll, setCheckingAll] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: 'auth',
      name: 'Autenticación y Seguridad',
      module: 'Módulo Core',
      description: 'Gestión de sesiones, tokens JWT, recuperación de contraseña y políticas de privacidad.',
      url: `${AUTH_URL}/`,
      route: '/login',
      status: 'checking',
      icon: ShieldCheck,
    },
    {
      id: 'graduates',
      name: 'Egresados y Hojas de Vida',
      module: 'Módulo 1',
      description: 'Perfiles profesionales, escaneo de CV por reglas, historial académico y directorio.',
      url: `${GRADUATES_URL}/`,
      route: '/graduate/profile',
      status: 'checking',
      icon: GraduationCap,
    },
    {
      id: 'companies',
      name: 'Empresas y Vacantes',
      module: 'Módulo 2',
      description: 'Bolsa de empleo institucional, postulaciones a vacantes y registro a eventos.',
      url: `${COMPANIES_URL}/`,
      route: '/vacantes',
      status: 'checking',
      icon: Building2,
    },
    {
      id: 'matchmaking',
      name: 'Motor de Afinidad (Matchmaking)',
      module: 'Módulo 3',
      description: 'Cálculo algorítmico de compatibilidad egresado-vacante y notificaciones de alta afinidad.',
      url: `${MATCHMAKING_URL}/health`,
      route: '/matchmaking',
      status: 'checking',
      icon: Sparkles,
    },
    {
      id: 'dashboard',
      name: 'Dashboard Administrativo y BI',
      module: 'Módulo 4',
      description: 'Métricas institucionales de empleabilidad, reportes y analítica ejecutiva Power BI.',
      url: `${DASHBOARD_URL}/`,
      route: '/admin/dashboard',
      status: 'checking',
      icon: BarChart3,
    },
  ]);

  const checkSingleService = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = performance.now();
    try {
      // Timeout rápido de 4s para no demorar al usuario
      await axios.get(service.url, { timeout: 4000 });
      const latency = Math.round(performance.now() - startTime);
      return { ...service, status: 'operational', latencyMs: latency };
    } catch {
      // Si responde con cualquier estado HTTP (ej. 401, 404, 200), el servidor está vivo
      const latency = Math.round(performance.now() - startTime);
      return { ...service, status: 'maintenance', latencyMs: latency };
    }
  };

  const checkAllServices = useCallback(async () => {
    setCheckingAll(true);
    setServices((prev) => prev.map((s) => ({ ...s, status: 'checking' })));

    const updated = await Promise.all(
      services.map((service) => checkSingleService(service))
    );

    setServices(updated);
    setCheckingAll(false);
  }, []);

  useEffect(() => {
    checkAllServices();
  }, []);

  const operationalCount = services.filter((s) => s.status === 'operational').length;
  const isPartiallyOperational = operationalCount > 0 && operationalCount < services.length;
  const isFullyOperational = operationalCount === services.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-between p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Portal del Egresado UPC
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Monitor de Estado
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Arquitectura de Microservicios Distribuidos (AWS ECS Fargate)
            </p>
          </div>
        </div>

        <button
          onClick={checkAllServices}
          disabled={checkingAll}
          className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingAll ? 'animate-spin' : ''}`} />
          {checkingAll ? 'Recomprobando...' : 'Recomprobar estado'}
        </button>
      </header>

      {/* Main Content Card */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-6">
        {/* Status Alert Banner */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isFullyOperational 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : isPartiallyOperational 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isFullyOperational 
                ? 'bg-emerald-600 text-white' 
                : isPartiallyOperational 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-red-600 text-white'
            }`}>
              {isFullyOperational ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-base">
                {isFullyOperational 
                  ? 'Todos los microservicios están 100% operativos'
                  : isPartiallyOperational 
                    ? `Operación Parcial (${operationalCount} de ${services.length} servicios disponibles)` 
                    : 'Plataforma en Mantenimiento General'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                {isPartiallyOperational ? (
                  <>
                    Los módulos desconectados están en proceso de actualización o despliegue. 
                    <strong> Las funcionalidades de los módulos operativos continúan disponibles</strong>; 
                    puedes seguir navegando por las secciones activas sin necesidad de esperar.
                  </>
                ) : isFullyOperational ? (
                  'Todas las consultas y microservicios responden con normalidad. Puedes regresar al sistema.'
                ) : (
                  'Los contenedores de los microservicios se están reiniciando tras una actualización en la nube de AWS.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              Ir al Inicio
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Microservices Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => {
            const Icon = svc.icon;
            const isOp = svc.status === 'operational';
            const isChecking = svc.status === 'checking';

            return (
              <div 
                key={svc.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isOp ? 'bg-emerald-50 text-emerald-700' : isChecking ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {svc.module}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">
                          {svc.name}
                        </h3>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isChecking ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Verificando
                        </span>
                      ) : isOp ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                          Operativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          Mantenimiento
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed min-h-[3rem]">
                    {svc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {svc.latencyMs ? `Latencia: ${svc.latencyMs}ms` : 'Sin latencia'}
                  </span>

                  {isOp ? (
                    <button
                      onClick={() => window.location.href = svc.route}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      Abrir módulo
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 italic">
                      En actualización...
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Infrastructure Card */}
          <div className="bg-slate-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-white">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Capa Cloud
                  </span>
                  <h3 className="font-bold text-sm text-slate-100">
                    Amazon Web Services
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Despliegue Multi-AZ en AWS ECS Fargate, balanceado mediante Application Load Balancer (ALB) y persistido en PostgreSQL RDS.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Región: us-east-1</span>
              <span className="text-emerald-400 font-mono">Fargate v1.4</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center pt-6 border-t border-slate-200/80 text-xs text-slate-400">
        Universidad Popular del Cesar (UPC) · Portal del Egresado · Vicerrectoría Académica
      </footer>
    </div>
  );
}
