import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, CheckCheck, Building2, BellRing, Info } from 'lucide-react';
import { getNotifications, markNotificationRead, getAuthNotifications, markAuthNotificationRead, type MatchNotification, type AuthNotification } from '../api';

const REFRESH_MS = 60000;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
};

type UnifiedNotification = 
  | (MatchNotification & { __type: 'match' })
  | (AuthNotification & { __type: 'auth' });

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const graduateId = user?.role_name === 'GRADUATE' ? user?.id : null;
  const isAuth = !!user;
  
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!isAuth) return;
    try {
      const all: UnifiedNotification[] = [];
      
      // Fetch Match Notifications (only for Graduates)
      if (graduateId) {
        try {
          const { data } = await getNotifications(graduateId);
          all.push(...data.map(n => ({ ...n, __type: 'match' as const })));
        } catch (e) {}
      }

      // Fetch Auth Notifications (for everyone, mostly graduates)
      try {
        const { data } = await getAuthNotifications();
        all.push(...data.map(n => ({ ...n, __type: 'auth' as const })));
      } catch (e) {}

      // Sort by date desc
      all.sort((a, b) => {
        const d1 = new Date(a.__type === 'match' ? a.sent_at : a.created_at).getTime();
        const d2 = new Date(b.__type === 'match' ? b.sent_at : b.created_at).getTime();
        return d2 - d1;
      });

      setNotifications(all);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!isAuth) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, graduateId]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  };

  const handleClickNotification = async (n: UnifiedNotification) => {
    setOpen(false);
    if (!n.is_read) {
      if (n.__type === 'match') {
        markNotificationRead(n.id).catch(() => undefined);
      } else {
        markAuthNotificationRead(n.id).catch(() => undefined);
      }
      setNotifications((prev) => prev.map((p) => (p.__type === n.__type && p.id === n.id ? { ...p, is_read: true } : p)));
    }
    if (n.__type === 'match') {
      navigate('/jobs');
    } else {
      navigate('/mis-aplicaciones');
    }
  };

  const handleMarkAll = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => {
      if (n.__type === 'match') return markNotificationRead(n.id).catch(() => undefined);
      return markAuthNotificationRead(n.id).catch(() => undefined);
    }));
    setNotifications((prev) => prev.map((p) => ({ ...p, is_read: true })));
  };

  return (
    <div ref={ref} className="relative z-50">
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg transition-all duration-200 relative"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-ink-secondary" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm animate-pulse-soft"
            style={{ backgroundColor: '#e11d48' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+12px)] w-[380px] max-h-[500px] overflow-hidden rounded-xl shadow-xl flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-muted)' }}
          >
            <p className="text-sm font-bold text-ink flex items-center gap-2">
              <BellRing className="w-4 h-4 text-brand-500" /> Notificaciones
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity text-brand-600"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-ink-tertiary">
                Cargando...
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center justify-center text-ink-tertiary">
                <Bell className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-semibold">Todo al día</p>
                <p className="text-xs opacity-70">No tienes notificaciones pendientes.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isMatch = n.__type === 'match';
                
                return (
                  <button
                    key={`${n.__type}_${n.id}`}
                    onClick={() => handleClickNotification(n)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors hover-bg-muted relative"
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: n.is_read ? 'transparent' : 'var(--bg-muted)',
                    }}
                  >
                    {!n.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
                    )}
                    
                    <span
                      className={`mt-1 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isMatch ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {isMatch ? <Briefcase className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink truncate leading-tight">
                        {isMatch ? (n as MatchNotification).job_title || 'Sugerencia de Vacante' : (n as AuthNotification).title}
                      </span>
                      {isMatch ? (
                        <span className="block text-xs mt-1 text-ink-secondary flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{(n as MatchNotification).company_name || 'Empresa'}</span>
                        </span>
                      ) : (
                        <span className="block text-xs mt-1 text-ink-secondary line-clamp-2">
                          {(n as AuthNotification).message}
                        </span>
                      )}
                      
                      <span className="block text-[11px] mt-2 font-medium text-ink-tertiary">
                        {timeAgo(isMatch ? (n as MatchNotification).sent_at : (n as AuthNotification).created_at)}
                      </span>
                    </span>
                    
                    {isMatch && (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-sm bg-green-100 text-green-700 border border-green-200"
                      >
                        {Number((n as MatchNotification).score).toFixed(0)}%
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}