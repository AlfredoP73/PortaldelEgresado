import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  KeyRound, ArrowLeft, Loader2, GraduationCap,
  TrendingUp, Mail, Shield, CheckCircle2
} from 'lucide-react';

export default function VerifyPin() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  if (!email) { navigate('/forgot-password'); return null; }

  const fieldBase: React.CSSProperties = {
    width: '100%', padding: '0.9rem 1rem',
    borderRadius: '12px', fontSize: '24px', fontWeight: 800,
    letterSpacing: '0.6em', textAlign: 'center' as const, outline: 'none',
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#1e293b', transition: 'all 0.18s ease',
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#22a86e';
    e.target.style.background = '#fff';
    e.target.style.boxShadow = '0 0 0 3px rgba(34,168,110,0.12)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e2e8f0';
    e.target.style.background = '#f8fafc';
    e.target.style.boxShadow = 'none';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6) { setError('El PIN debe tener exactamente 6 dígitos'); return; }

    setIsLoading(true);
    try {
      const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8080';
      const res = await fetch(`${AUTH_URL}/api/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/reset-password', { state: { email, pin } });
      } else {
        setError(data.detail || 'PIN incorrecto o expirado. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ══ LEFT PANEL ════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-col lg:w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a3d25 0%, #0e4832 40%, #0d3d28 100%)' }}>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top left, rgba(34,168,110,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Portal de Egresados</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Universidad Popular del Cesar</p>
            </div>
          </div>

          <div className="mb-auto mt-16">
            <h1 className="text-4xl font-black text-white mb-4 leading-tight">
              Verifica tu<br />
              <span style={{ color: '#4ade80' }}>código PIN</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '360px' }}>
              Enviamos un código de 6 dígitos a:
            </p>
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit"
              style={{ background: 'rgba(34,168,110,0.12)', border: '1px solid rgba(34,168,110,0.2)' }}>
              <Mail className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span className="text-sm font-semibold text-white">{email}</span>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { icon: Mail, label: 'Revisa tu bandeja de entrada' },
                { icon: KeyRound, label: 'Copia el PIN de 6 dígitos' },
                { icon: Shield, label: 'El PIN expira en 15 minutos' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(74,222,128,0.7)' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Sistema de Egresados</span>
            </div>
            <div className="w-px h-3.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80', opacity: 0.6 }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Acreditado por CNA</span>
            </div>
            <div className="w-px h-3.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} UPC</span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative" style={{ background: '#ffffff' }}>
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(34,168,110,0.06) 0%, transparent 65%)', filter: 'blur(30px)' }} />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <img src="/logo.png" alt="UPC Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Portal de Egresados</h1>
          </div>

          <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid #eaeef2', boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.03)' }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid #f0f3f5' }}>
              <div className="flex items-center gap-3.5 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #22a86e, #0e4832)' }}>
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-[1.6rem] font-black text-[#111827] tracking-tight leading-none">
                  Ingresar PIN
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed pl-[54px] text-[#6B7280]">
                Ingresa el código de 6 dígitos enviado a <strong className="text-[#111827]">{email}</strong>
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* PIN display indicators */}
                <div className="flex justify-center gap-2 mb-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-9 h-1.5 rounded-full transition-all duration-200"
                      style={{ background: i < pin.length ? '#22a86e' : '#e2e8f0' }} />
                  ))}
                </div>

                {/* PIN input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280] text-center">
                    Código PIN de 6 dígitos
                  </label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    style={fieldBase} onFocus={onFocus} onBlur={onBlur}
                    placeholder="000000" value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    required autoComplete="one-time-code"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={isLoading || pin.length !== 6}
                  style={{
                    width: '100%', padding: '0.95rem', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #22a86e 0%, #0e4832 100%)',
                    boxShadow: '0 4px 18px rgba(21,138,88,0.32)',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    border: 'none', cursor: (isLoading || pin.length !== 6) ? 'not-allowed' : 'pointer',
                    opacity: (isLoading || pin.length !== 6) ? 0.55 : 1, transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => { if (!isLoading && pin.length === 6) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 26px rgba(21,138,88,0.42)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(21,138,88,0.32)'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Verificando...</> : <><CheckCircle2 className="w-4 h-4" />Verificar PIN</>}
                  </span>
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 pb-7 pt-5 text-center" style={{ borderTop: '1px solid #f0f3f5' }}>
              <Link to="/forgot-password"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#22a86e')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>¿No recibiste el código? <span style={{ color: '#158a58', fontWeight: 900 }}>Ingresar otro correo</span></span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
