import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock, Loader2, GraduationCap, TrendingUp,
  Eye, EyeOff, CheckCircle2, Shield
} from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const pin = location.state?.pin;

  if (!email || !pin) { navigate('/forgot-password'); return null; }

  const fieldBase: React.CSSProperties = {
    width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem',
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

  // Strength meter
  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = getStrength(password);
  const strengthColors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const strengthLabels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }

    setIsLoading(true);
    try {
      const AUTH_URL = import.meta.env.VITE_AUTH_URL !== undefined ? import.meta.env.VITE_AUTH_URL : 'http://localhost:8080';
      const res = await fetch(`${AUTH_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(data.detail || 'Error al actualizar la contraseña.');
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
              Crea tu nueva<br />
              <span style={{ color: '#4ade80' }}>contraseña</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '360px' }}>
              Elige una contraseña segura para proteger tu cuenta institucional.
            </p>

            {/* Tips */}
            <div className="mt-10 space-y-3">
              {[
                'Al menos 8 caracteres',
                'Una letra mayúscula',
                'Un número',
                'Un carácter especial (!@#$...)',
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(74,222,128,0.6)' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{tip}</span>
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
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-[1.6rem] font-black text-[#111827] tracking-tight leading-none">
                  Nueva contraseña
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed pl-[54px] text-[#6B7280]">
                Crea una contraseña segura para tu cuenta.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              {success ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #eefbf4, #d6f5e3)' }}>
                    <CheckCircle2 className="w-8 h-8" style={{ color: '#22a86e' }} />
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] mb-2">¡Contraseña actualizada!</h3>
                  <p className="text-sm text-[#6B7280]">Tu contraseña fue cambiada exitosamente.<br />Redirigiendo al inicio de sesión…</p>
                  <div className="mt-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#22a86e' }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Nueva contraseña</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input type={showPassword ? 'text' : 'password'}
                        style={fieldBase} onFocus={onFocus} onBlur={onBlur}
                        placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#c8d0d8', background: 'none', border: 'none', cursor: 'pointer' }}
                        tabIndex={-1}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div>
                        <div className="flex gap-1 h-1.5 mt-2 rounded-full overflow-hidden">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i < strength ? strengthColors[strength] : 'bg-slate-100'}`} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-right mt-1" style={{ color: '#9ca3af' }}>{strengthLabels[strength]}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">Confirmar contraseña</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input type={showConfirm ? 'text' : 'password'}
                        style={{
                          ...fieldBase,
                          borderColor: confirmPassword.length > 0 ? (passwordsMatch ? '#22a86e' : '#fca5a5') : '#e2e8f0',
                          boxShadow: confirmPassword.length > 0 ? (passwordsMatch ? '0 0 0 3px rgba(34,168,110,0.12)' : '0 0 0 3px rgba(252,165,165,0.2)') : 'none',
                        }}
                        onFocus={onFocus} onBlur={onBlur}
                        placeholder="••••••••" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#c8d0d8', background: 'none', border: 'none', cursor: 'pointer' }}
                        tabIndex={-1}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <p className={`text-[11px] font-semibold ${passwordsMatch ? 'text-green-600' : 'text-red-400'}`}>
                        {passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={isLoading || !passwordsMatch || strength < 2}
                    style={{
                      width: '100%', padding: '0.95rem', borderRadius: '14px',
                      background: 'linear-gradient(135deg, #22a86e 0%, #0e4832 100%)',
                      boxShadow: '0 4px 18px rgba(21,138,88,0.32)',
                      color: '#fff', fontWeight: 700, fontSize: '15px',
                      border: 'none', cursor: (isLoading || !passwordsMatch || strength < 2) ? 'not-allowed' : 'pointer',
                      opacity: (isLoading || !passwordsMatch || strength < 2) ? 0.55 : 1, transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={e => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 26px rgba(21,138,88,0.42)'; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(21,138,88,0.32)'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Actualizando...</> : <><CheckCircle2 className="w-4 h-4" />Establecer nueva contraseña</>}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
