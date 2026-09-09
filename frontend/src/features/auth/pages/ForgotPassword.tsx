import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail, ArrowLeft, Loader2, GraduationCap, Shield,
  Sparkles, TrendingUp, KeyRound
} from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const fieldBase: React.CSSProperties = {
    width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem',
    paddingTop: '0.8rem', paddingBottom: '0.8rem',
    borderRadius: '12px', fontSize: '14px', outline: 'none',
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
    if (!email) { setError('Por favor ingresa tu correo electrónico'); return; }

    setIsLoading(true);
    try {
      const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8080';
      const res = await fetch(`${AUTH_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setTimeout(() => navigate('/verify-pin', { state: { email } }), 2000);
      } else {
        setError(data.detail || 'Ocurrió un error. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ══ LEFT PANEL — verde oscuro ══════════════════════════════ */}
      <div className="hidden lg:flex lg:flex-col lg:w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a3d25 0%, #0e4832 40%, #0d3d28 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glow */}
        <div className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top left, rgba(34,168,110,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          {/* Logo */}
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

          {/* Central content */}
          <div className="mb-auto mt-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{ background: 'rgba(34,168,110,0.15)', border: '1px solid rgba(34,168,110,0.25)' }}>
              <Sparkles className="w-3.5 h-3.5 text-brand-400" style={{ color: '#4ade80' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Recuperación segura</span>
            </div>

            <h1 className="text-4xl font-black text-white mb-4 leading-tight">
              Recupera el acceso<br />
              <span style={{ color: '#4ade80' }}>a tu cuenta</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '360px' }}>
              Te enviaremos un código PIN de 6 dígitos a tu correo institucional para restablecer tu contraseña de forma segura.
            </p>

            {/* Steps */}
            <div className="mt-10 space-y-4">
              {[
                { icon: Mail, step: '1', label: 'Ingresa tu correo institucional' },
                { icon: KeyRound, step: '2', label: 'Recibe el código PIN en tu bandeja' },
                { icon: Shield, step: '3', label: 'Crea tu nueva contraseña segura' },
              ].map(({ icon: Icon, step, label }) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{ background: 'rgba(34,168,110,0.2)', border: '1px solid rgba(34,168,110,0.3)', color: '#4ade80' }}>
                    {step}
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
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

      {/* ══ RIGHT PANEL — blanco ════════════════════════════════════ */}
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
            <p className="text-slate-500 text-sm mt-1">Universidad Popular del Cesar</p>
          </div>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid #eaeef2', boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.03)' }}>

            {/* Card header */}
            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid #f0f3f5' }}>
              <div className="flex items-center gap-3.5 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #22a86e, #0e4832)' }}>
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-[1.6rem] font-black text-[#111827] tracking-tight leading-none">
                  Recuperar acceso
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed pl-[54px] text-[#6B7280]">
                Ingresa tu correo institucional y te enviaremos un PIN de recuperación.
              </p>
            </div>

            {/* Form body */}
            <div className="px-8 py-6">
              {sent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #eefbf4, #d6f5e3)' }}>
                    <Mail className="w-7 h-7" style={{ color: '#22a86e' }} />
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] mb-2">¡Correo enviado!</h3>
                  <p className="text-sm text-[#6B7280]">
                    Enviamos el PIN a <strong className="text-[#111827]">{email}</strong>.<br />
                    Redirigiendo para verificarlo…
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#22a86e' }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email" style={fieldBase} onFocus={onFocus} onBlur={onBlur}
                        placeholder="correo@unicesar.edu.co" value={email}
                        onChange={e => setEmail(e.target.value)} required autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={isLoading}
                    style={{
                      width: '100%', padding: '0.95rem', borderRadius: '14px', marginTop: '0.25rem',
                      background: 'linear-gradient(135deg, #22a86e 0%, #0e4832 100%)',
                      boxShadow: '0 4px 18px rgba(21,138,88,0.32)',
                      color: '#fff', fontWeight: 700, fontSize: '15px',
                      border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.6 : 1, transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={e => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 26px rgba(21,138,88,0.42)'; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(21,138,88,0.32)'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Enviando código...</> : <>Enviar PIN de recuperación</>}
                    </span>
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 pb-7 pt-5 text-center" style={{ borderTop: '1px solid #f0f3f5' }}>
              <Link to="/login"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#22a86e')}
                onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>¿Recordaste tu contraseña? <span style={{ color: '#158a58', fontWeight: 900 }}>Inicia sesión</span></span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
