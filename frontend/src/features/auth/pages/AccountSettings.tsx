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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <h2 className="page-title">Mi cuenta</h2>
        <p className="text-sm mt-1 text-ink-secondary">
          {isCompany
            ? 'Administra tu correo de acceso y tu contraseña.'
            : 'Administra la contraseña de tu usuario.'}
        </p>
      </div>

      {/* Resumen */}
      <div className="card p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
        >
          <UserCircle className="w-7 h-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">Sesión actual</p>
          <p className="font-bold text-ink truncate">{user?.email}</p>
        </div>
        <span
          className="ml-auto px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
        >
          {isCompany ? 'Empresa' : user?.role_name === 'ADMIN' ? 'Administrador' : 'Egresado'}
        </span>
      </div>

      {/* Correo — solo empresa */}
      {isCompany && (
        <form onSubmit={handleEmail} className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Correo de acceso</h3>
          </div>
          <p className="text-sm text-ink-secondary">
            Este es el correo con el que inicias sesión. Por seguridad debes confirmar tu contraseña actual.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="flex justify-end pt-2 border-t border-[var(--border-color)]">
            <button type="submit" disabled={savingEmail} className="btn-primary min-w-[160px] flex justify-center items-center gap-2 mt-4">
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar correo'}
            </button>
          </div>
        </form>
      )}

      {/* Contraseña */}
      <form onSubmit={handlePassword} className="card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Cambiar contraseña</h3>
        </div>

        <PasswordField
          label="Contraseña actual"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <PasswordField
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: i < strength.score ? strength.color : 'var(--bg-muted)' }}
                    />
                  ))}
                </div>
                <p className="text-[11px] mt-1 font-semibold" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          <div>
            <PasswordField
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] mt-1 font-semibold text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <span className="flex items-center gap-1.5 text-xs text-ink-secondary mt-4">
            <ShieldCheck className="w-4 h-4" /> Se cifra con bcrypt y nunca se almacena en texto plano.
          </span>
          <button type="submit" disabled={savingPassword} className="btn-primary min-w-[160px] flex justify-center items-center gap-2 mt-4">
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
