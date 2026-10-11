import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, Database, RefreshCw, ShieldCheck, Users, Building2, GraduationCap,
  Sparkles, LayoutDashboard, CheckCircle2, AlertTriangle, XCircle, Loader2,
} from 'lucide-react';
import { authApi } from '../../../api';

type State = 'operational' | 'degraded' | 'down';

interface ServiceStatus {
  key: string;
  name: string;
  description: string;
  status: State;
  latency_ms: number | null;
  http_status: number | null;
  detail: string | null;
}

interface SystemStatus {
  overall: State;
  checked_at: string;
  services: ServiceStatus[];
}

const REFRESH_MS = 30000;
const HISTORY_LEN = 20;

const STATE_META: Record<State, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  operational: { label: 'Operativo', color: '#10b981', bg: 'rgba(16,185,129,0.12)', Icon: CheckCircle2 },
  degraded: { label: 'Degradado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: AlertTriangle },
  down: { label: 'Caído', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: XCircle },
};

const OVERALL_TEXT: Record<State, string> = {
  operational: 'Todos los sistemas operativos',
  degraded: 'Algunos servicios presentan degradación',
  down: 'Interrupción del servicio',
};

const SERVICE_ICONS: Record<string, typeof Users> = {
  auth: ShieldCheck,
  graduates: GraduationCap,
  companies: Building2,
  matchmaking: Sparkles,
  dashboard: LayoutDashboard,
  database: Database,
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-8 flex items-center text-[10px] text-ink-secondary">Recopilando datos…</div>;
  }
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 32;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function ServiceStatusPanel() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const res = await authApi.get<SystemStatus>('/system/status');
      setData(res.data);
      setError(null);
      setHistory((prev) => {
        const next = { ...prev };
        res.data.services.forEach((s) => {
          if (s.latency_ms != null) {
            next[s.key] = [...(next[s.key] ?? []), s.latency_ms].slice(-HISTORY_LEN);
          }
        });
        return next;
      });
    } catch (e: any) {
      setError(e.response?.data?.detail || 'No se pudo consultar el estado del sistema');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    timer.current = setInterval(() => fetchStatus(), REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [fetchStatus]);

  const overall = data ? STATE_META[data.overall] : null;
  const counts = data
    ? {
        operational: data.services.filter((s) => s.status === 'operational').length,
        total: data.services.length,
      }
    : null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="p-6 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <Activity className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
          Estado de los microservicios
        </h2>
        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}>
          Admin Only
        </span>
        <div className="ml-auto flex items-center gap-3">
          {data && (
            <span className="text-[11px]" style={{ color: 'var(--text-ink-secondary)' }}>
              Última verificación: {new Date(data.checked_at).toLocaleTimeString('es-CO')}
            </span>
          )}
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="btn-outline flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : error && !data ? (
        <div className="p-6 text-sm font-semibold text-red-500">{error}</div>
      ) : data && overall && counts ? (
        <>
          {/* Banner general */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: overall.bg }}>
            <overall.Icon className="w-6 h-6" style={{ color: overall.color }} />
            <div>
              <p className="font-bold text-sm" style={{ color: overall.color }}>{OVERALL_TEXT[data.overall]}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-ink-secondary)' }}>
                {counts.operational} de {counts.total} componentes operativos · actualización automática cada 30 s
              </p>
            </div>
          </div>

          {/* Tarjetas */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.services.map((s) => {
              const meta = STATE_META[s.status];
              const Icon = SERVICE_ICONS[s.key] ?? Activity;
              const values = history[s.key] ?? [];
              return (
                <div
                  key={s.key}
                  className="rounded-xl p-4 border transition-shadow hover:shadow-md"
                  style={{ backgroundColor: 'var(--bg-card, var(--bg-surface))', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{s.name}</p>
                      <p className="text-[11px] leading-snug" style={{ color: 'var(--text-ink-secondary)' }}>{s.description}</p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <span className="relative flex h-2 w-2">
                        {s.status === 'operational' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: meta.color }} />
                        )}
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: meta.color }} />
                      </span>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-ink-secondary)' }}>Latencia</p>
                        <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                          {s.latency_ms != null ? `${s.latency_ms} ms` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-ink-secondary)' }}>HTTP</p>
                        <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                          {s.http_status ?? '—'}
                        </p>
                      </div>
                    </div>
                    <Sparkline values={values} color={meta.color} />
                  </div>

                  {s.detail && (
                    <p className="mt-3 text-[11px] font-mono truncate" title={s.detail} style={{ color: s.status === 'down' ? meta.color : 'var(--text-ink-secondary)' }}>
                      {s.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
