import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Mail, Eye, EyeOff, Loader2, ShieldCheck, UserCircle } from 'lucide-react';
import { authApi } from '../../../api';

const MIN_LENGTH = 6;

function PasswordField({
  label, value, onChange, placeholder, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-secondary mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input w-full pr-10"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function strengthOf(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= MIN_LENGTH) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: 'Muy débil', color: '#ef4444' },
    { label: 'Débil', color: '#f97316' },
    { label: 'Aceptable', color: '#eab308' },
    { label: 'Buena', color: '#22c55e' },
    { label: 'Excelente', color: '#10b981' },
  ];
  return { score, ...map[score] };
}

export default function AccountSettings() {
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isCompany = user?.role_name === 'COMPANY';

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Correo (solo empresas)
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const strength = strengthOf(newPassword);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_LENGTH) {
      toast.error(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    try {
      setSavingPassword(true);
      await authApi.post('/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEmail(true);
      const res = await authApi.put('/change-email', {
        new_email: newEmail,
        current_password: emailPassword,
      });
      // El JWT usa el correo como identidad: se reemplaza el token por el nuevo
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
      }
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify({ ...user, ...res.data.user }));
      }
      toast.success('Correo actualizado exitosamente');
      setNewEmail('');
      setEmailPassword('');
      setTimeout(() => window.location.reload(), 800);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'No se pudo cambiar el correo');
    } finally {
      setSavingEmail(false);
    }
  };

  const requirements = [
    { label: `Mínimo ${MIN_LENGTH} caracteres de longitud`, met: newPassword.length >= MIN_LENGTH },
    { label: 'Recomendado: 10 o más caracteres', met: newPassword.length >= 10 },
    { label: 'Combina letras mayúsculas y minúsculas', met: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'Incluye números y caracteres especiales', met: /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'Confirmación coincide exactamente', met: newPassword.length > 0 && newPassword === confirmPassword },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="page-title">Mi cuenta y Seguridad</h2>
            <p className="text-sm mt-1 text-ink-secondary">
              {isCompany
                ? 'Administra tu correo de acceso y las credenciales de seguridad de tu empresa.'
                : 'Administra tu contraseña y la seguridad de tu cuenta institucional.'}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold tracking-wider rounded-full uppercase self-start sm:self-auto"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
          >
            <ShieldCheck className="w-4 h-4" />
            Cuenta Verificada · {isCompany ? 'Empresa' : user?.role_name === 'ADMIN' ? 'Administrador' : 'Egresado UPC'}
          </span>
        </div>
      </div>

      {/* Resumen de sesión a ancho completo */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
            >
              <UserCircle className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">Correo de sesión activa</p>
              <p className="font-bold text-base text-ink truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-4 md:pt-0 md:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">Tipo de perfil</p>
            <p className="font-semibold text-sm text-ink mt-0.5">
              {isCompany ? 'Empresa Aliada' : user?.role_name === 'ADMIN' ? 'Administrador Institucional' : 'Egresado Institucional (@unicesar.edu.co)'}
            </p>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-4 md:pt-0 md:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">Protección de credenciales</p>
            <p className="font-semibold text-sm text-ink mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              Hash Bcrypt + Autenticación JWT
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal ocupando todo el ancho en 12 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Correo — solo empresa */}
          {isCompany && (
            <form onSubmit={handleEmail} className="card p-6 lg:p-8 space-y-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Correo de acceso</h3>
                  <p className="text-xs text-ink-secondary">Actualiza el correo con el que inicias sesión en el portal.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-secondary mb-1">Nuevo correo</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input w-full"
                    placeholder="nuevo@empresa.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <PasswordField
                  label="Contraseña actual"
                  value={emailPassword}
                  onChange={setEmailPassword}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                <button type="submit" disabled={savingEmail} className="btn-primary min-w-[180px] flex justify-center items-center gap-2">
                  {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar correo'}
                </button>
              </div>
            </form>
          )}

          {/* Contraseña */}
          <form onSubmit={handlePassword} className="card p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
                >
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Cambiar contraseña</h3>
                  <p className="text-xs text-ink-secondary">Ingresa tu contraseña actual y define una nueva clave segura.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <PasswordField
                  label="Contraseña actual"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="md:col-span-1">
                <PasswordField
                  label="Nueva contraseña"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
                  autoComplete="new-password"
                />
              </div>

              <div className="md:col-span-1">
                <PasswordField
                  label="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] mt-1.5 font-semibold text-red-500">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>

            {newPassword && (
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink-secondary">Nivel de fortaleza de la nueva contraseña</span>
                  <span className="text-xs font-bold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: i < strength.score ? strength.color : 'var(--border-color)' }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)]">
              <span className="flex items-center gap-2 text-xs text-ink-secondary">
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                Tu contraseña se cifra con Bcrypt y nunca se almacena en texto plano.
              </span>
              <button type="submit" disabled={savingPassword} className="btn-primary min-w-[200px] flex justify-center items-center gap-2">
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>

        {/* Panel lateral derecho que completa el ancho de la pantalla */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] pb-3">
              <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Lista de Verificación</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Te recomendamos cumplir estos criterios para mantener tu cuenta institucional protegida:
            </p>
            <div className="space-y-3 pt-1">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                    style={{
                      backgroundColor: req.met ? 'var(--accent-primary)' : 'var(--bg-muted)',
                      color: req.met ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    ✓
                  </div>
                  <span className={`text-xs ${req.met ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink">Nota Institucional</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {isCompany
                ? 'Como empresa aliada puedes actualizar tanto tu correo de contacto como tu contraseña de acceso en cualquier momento.'
                : 'Por políticas de la Universidad Popular del Cesar, tu correo institucional @unicesar.edu.co es tu identificador único de egresado y permanece vinculado a tu historial académico.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
