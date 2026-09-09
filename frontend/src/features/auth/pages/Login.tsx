import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Mail, Lock, AlertCircle, Loader2, Eye, EyeOff,
    BookOpen, Users, Award, Briefcase, GraduationCap,
    Building2, CheckCircle2, ArrowRight, Shield, TrendingUp, Sparkles
} from 'lucide-react';
import { authApi } from '../../../api';

interface ApiError {
    response?: { data?: { detail?: string } };
    message?: string;
}

const features = [
    { icon: Briefcase, title: 'Bolsa de Empleo', desc: 'Conectamos egresados con empresas aliadas de la región Caribe.' },
    { icon: Users, title: 'Red de Egresados', desc: 'Comunidad de más de 15,000 profesionales activos.' },
    { icon: BookOpen, title: 'Seguimiento Académico', desc: 'Registro y validación del historial laboral y académico post-grado.' },
    { icon: Award, title: 'Acreditación de Calidad', desc: 'Alineado con los estándares del CNA para instituciones de alta calidad.' },
];

const stats = [
    { value: '15,000+', label: 'Egresados activos' },
    { value: '380+', label: 'Empresas aliadas' },
    { value: '94%', label: 'Empleabilidad' },
];

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [roleId, setRoleId] = useState(3);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isRegistering && roleId === 3 && !email.toLowerCase().endsWith('@unicesar.edu.co')) {
            setError('Debes registrarte con tu correo institucional @unicesar.edu.co');
            return;
        }
        
        setLoading(true);
        try {
            if (isRegistering) {
                await authApi.post('/register', { email, password, role_id: roleId });
                setRegistrationSuccess(true);
            } else {
                const { data } = await authApi.post('/login', { email, password });
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.role_name === 'GRADUATE') navigate('/profile', { replace: true });
                else navigate('/companies', { replace: true });
            }
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            setError(apiErr.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        try {
            await authApi.post('/resend-verification', { email });
            alert('Correo de verificación reenviado a ' + email);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            alert(apiErr.response?.data?.detail || 'Error al reenviar el correo');
        }
    };

    const getPasswordStrength = () => {
        if (!password) return 0;
        let score = 0;
        if (password.length > 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const strength = getPasswordStrength();
    const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
    const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-brand-400', 'bg-emerald-500'];

    const fieldBase: React.CSSProperties = {
        width: '100%', borderRadius: '14px', color: '#111827', fontSize: '15px',
        paddingLeft: '2.75rem', paddingTop: '0.9rem', paddingBottom: '0.9rem', paddingRight: '1rem',
        border: '1.5px solid #e8ecf0', background: '#f5f8f7', outline: 'none', transition: 'all 0.18s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
    };

    const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.border = '1.5px solid #22a86e';
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(34,168,110,0.1)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.border = '1.5px solid #e8ecf0';
        e.currentTarget.style.background = '#f5f8f7';
        e.currentTarget.style.boxShadow = 'none';
    };

    return (
        <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* ══════════════════════════════════
          LEFT PANEL — dark green
      ══════════════════════════════════ */}
            <div
                className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
                style={{ background: 'linear-gradient(160deg, #051510 0%, #09291a 30%, #0d3d26 60%, #115040 100%)' }}
            >
                {/* Soft ambient glows — NO grid lines */}
                <div className="absolute -top-40 -right-20 w-[560px] h-[560px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(34,168,110,0.16) 0%, transparent 65%)', filter: 'blur(60px)' }} />
                <div className="absolute bottom-0 left-0 w-[420px] h-[420px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(17,112,72,0.18) 0%, transparent 65%)', filter: 'blur(70px)' }} />
                <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(69,195,136,0.07) 0%, transparent 60%)', filter: 'blur(50px)' }} />

                <div className="relative z-10 flex flex-col h-full p-12 xl:p-14">

                    {/* Logo */}
                    <div className="flex items-center gap-4 animate-fade-in-up">
                        <div className="relative">
                            <div className="rounded-2xl flex items-center justify-center overflow-hidden"
                                style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)' }}>
                                <img src="/logo.png" alt="UPC" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full" style={{ background: '#45c388', border: '2px solid #051510' }} />
                        </div>
                        <div>
                            <p className="text-white font-bold text-[14px] leading-tight">Universidad Popular del Cesar</p>
                            <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(124,218,172,0.55)' }}>Oficina de Seguimiento a Egresados</p>
                        </div>
                    </div>

                    {/* Hero */}
                    <div className="mt-auto mb-8 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                        <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full"
                            style={{ background: 'rgba(34,168,110,0.13)', border: '1px solid rgba(34,168,110,0.22)' }}>
                            <Sparkles className="w-3 h-3 text-brand-300" />
                            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(124,218,172,0.85)' }}>
                                Sistema de Egresados y Empleabilidad
                            </span>
                        </div>

                        <h1 className="font-black leading-[1.07] tracking-[-0.03em]"
                            style={{ color: '#ffffff', fontSize: 'clamp(2.2rem, 3.5vw, 3.25rem)' }}>
                            Conectando<br />
                            <span style={{ background: 'linear-gradient(90deg, #45c388 0%, #7cdaac 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                talento
                            </span>{' '}con<br />el futuro.
                        </h1>

                        <p className="text-[14px] leading-relaxed mt-5 max-w-sm" style={{ color: 'rgba(255,255,255,0.42)' }}>
                            Plataforma institucional para el seguimiento laboral y académico de los egresados de la UPC.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        {stats.map(({ value, label }) => (
                            <div key={label} className="py-4 px-3 text-center rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-xl font-black text-white">{value}</p>
                                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-10 animate-fade-in-up" style={{ animationDelay: '220ms' }}>
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="group p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                                    style={{ background: 'rgba(34,168,110,0.18)', border: '1px solid rgba(34,168,110,0.28)' }}>
                                    <Icon className="w-4 h-4 text-brand-300" />
                                </div>
                                <p className="text-white font-semibold text-[13px] mb-1">{title}</p>
                                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Trust row */}
                    <div className="flex items-center gap-5 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Datos protegidos</span>
                        </div>
                        <div className="w-px h-3.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Acreditado por CNA</span>
                        </div>
                        <div className="w-px h-3.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} UPC</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════
          RIGHT PANEL — light, no dots
      ══════════════════════════════════ */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative" style={{ background: '#ffffff' }}>

                {/* Subtle green glow top-right only */}
                <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at top right, rgba(34,168,110,0.06) 0%, transparent 65%)', filter: 'blur(30px)' }} />
                <div className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at bottom left, rgba(34,168,110,0.04) 0%, transparent 65%)', filter: 'blur(30px)' }} />

                <div className="w-full max-w-[420px] relative z-10">

                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-10 animate-fade-in-up">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden"
                            style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <img src="/logo.png" alt="UPC Logo" className="w-12 h-12 object-contain" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">Portal de Egresados</h1>
                        <p className="text-slate-500 text-sm mt-1">Universidad Popular del Cesar</p>
                    </div>

                    {/* ── Registration success ── */}
                    {registrationSuccess ? (
                        <div className="animate-scale-in text-center p-10 rounded-3xl"
                            style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 20px 60px rgba(0,0,0,0.07)' }}>
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #eefbf4, #d6f5e3)' }}>
                                <Mail className="w-9 h-9 text-brand-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#111827] mb-3">{'Revisa tu correo'}</h2>
                            <p className="text-[#4B5563] text-sm leading-relaxed mb-8">
                                {'Enviamos un enlace de verificación a '}
                                <strong className="text-[#111827] font-semibold">{email}</strong>.<br />
                                {'Haz clic en él para activar tu cuenta.'}
                            </p>
                            <div className="space-y-3">
                                <button onClick={() => { setRegistrationSuccess(false); setIsRegistering(false); setPassword(''); }}
                                    className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
                                    {'Volver al inicio de sesión'}
                                </button>
                                <button onClick={handleResendEmail} className="w-full py-3.5 bg-white text-[#374151] border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">
                                    {'No recibí el correo, reenviar'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Main form card ── */
                        <div className="animate-fade-in-up"
                            style={{ background: '#fff', borderRadius: '22px', border: '1px solid #eaeef2', boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.03)' }}>

                            {/* Card header */}
                            <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid #f0f3f5' }}>
                                <div className="flex items-center gap-3.5 mb-2">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #22a86e, #0e4832)' }}>
                                        {isRegistering
                                            ? <Building2 className="w-5 h-5 text-white" />
                                            : <GraduationCap className="w-5 h-5 text-white" />}
                                    </div>
                                    <h2 className="text-[1.6rem] font-black text-[#111827] tracking-tight leading-none">
                                        {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                                    </h2>
                                </div>
                                <p className="text-[13px] leading-relaxed pl-[54px] text-[#6B7280]">
                                    {isRegistering
                                        ? 'Únete al portal institucional y accede a oportunidades únicas.'
                                        : 'Ingresa tus credenciales para acceder al portal institucional.'}
                                </p>
                            </div>

                            {/* Form body */}
                            <div className="px-8 py-6">
                                <form onSubmit={handleSubmit} className="space-y-5">

                                    {/* Role selector (register only) */}
                                    {isRegistering && (
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                                                ¿Cómo deseas registrarte?
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {([
                                                    { id: 3, label: 'Egresado', Icon: GraduationCap },
                                                    { id: 2, label: 'Empresa', Icon: Building2 },
                                                ] as const).map(({ id, label, Icon }) => (
                                                    <label key={id}
                                                        className="relative flex flex-col items-center gap-2 py-5 cursor-pointer rounded-2xl transition-all duration-200"
                                                        style={{
                                                            border: roleId === id ? '2px solid #22a86e' : '2px solid #e8ecf0',
                                                            background: roleId === id ? '#eefbf4' : '#fafbfc',
                                                        }}>
                                                        <input type="radio" checked={roleId === id} onChange={() => setRoleId(id)} className="sr-only" />
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                                                            style={{ background: roleId === id ? 'linear-gradient(135deg, #22a86e, #116e48)' : '#e8ecf0' }}>
                                                            <Icon className={`w-5 h-5 ${roleId === id ? 'text-white' : 'text-slate-400'}`} />
                                                        </div>
                                                        <span className={`text-sm font-bold ${roleId === id ? 'text-brand-700' : 'text-slate-500'}`}>{label}</span>
                                                        {roleId === id && (
                                                            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                                                                style={{ background: '#22a86e' }}>
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                            </div>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
                                            {'Correo electrónico'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <input type="email" style={fieldBase} onFocus={onFocus} onBlur={onBlur}
                                                placeholder={'correo@upc.edu.co'} value={email}
                                                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">
                                            {'Contraseña'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input type={showPassword ? 'text' : 'password'}
                                                style={fieldBase} onFocus={onFocus} onBlur={onBlur}
                                                placeholder={'••••••••'} value={password}
                                                onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                                style={{ color: '#c8d0d8', background: 'none', border: 'none', cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
                                                onMouseLeave={e => (e.currentTarget.style.color = '#c8d0d8')}
                                                tabIndex={-1} aria-label="Mostrar u ocultar contraseña">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {isRegistering && (
                                            <div className="pt-2 animate-fade-in-up">
                                                {password.length > 0 && (
                                                    <>
                                                        <div className="flex gap-1 h-1.5 mb-1.5 rounded-full overflow-hidden">
                                                            {[...Array(4)].map((_, i) => (
                                                                <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i < strength ? strengthColors[strength] : 'bg-slate-100'}`} />
                                                            ))}
                                                        </div>
                                                        <p className="text-[11px] font-semibold text-right mb-3" style={{ color: '#9ca3af' }}>{strengthLabels[strength]}</p>
                                                    </>
                                                )}
                                                
                                                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{'Requisitos de seguridad'}</p>
                                                    {[
                                                        { label: 'Al menos 8 caracteres', met: password.length >= 8 },
                                                        { label: 'Al menos una letra mayúscula', met: /[A-Z]/.test(password) },
                                                        { label: 'Al menos una letra minúscula', met: /[a-z]/.test(password) },
                                                        { label: 'Al menos un número', met: /[0-9]/.test(password) },
                                                        { label: 'Al menos un carácter especial', met: /[^A-Za-z0-9]/.test(password) },
                                                    ].map((req, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${req.met ? 'bg-brand-500 text-white' : 'bg-slate-200'}`}>
                                                                {req.met && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                            </div>
                                                            <span className={`text-[12px] transition-colors ${req.met ? 'text-brand-700 font-medium' : 'text-slate-500'}`}>
                                                                {req.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Forgot password - solo en modo login */}
                                    {!isRegistering && (
                                        <div className="text-right -mt-2">
                                            <Link
                                                to="/forgot-password"
                                                style={{ fontSize: '13px', fontWeight: 600, color: '#22a86e', textDecoration: 'none' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = '#0e4832')}
                                                onMouseLeave={e => (e.currentTarget.style.color = '#22a86e')}
                                            >
                                                ¿Olvidaste tu contraseña?
                                            </Link>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm animate-scale-in"
                                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span dangerouslySetInnerHTML={{ __html: error }} />
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button type="submit"
                                        disabled={loading || (isRegistering && strength < 2)}
                                        style={{
                                            width: '100%', padding: '0.95rem', borderRadius: '14px', marginTop: '0.5rem',
                                            background: 'linear-gradient(135deg, #22a86e 0%, #0e4832 100%)',
                                            boxShadow: '0 4px 18px rgba(21,138,88,0.32)',
                                            color: '#fff', fontWeight: 700, fontSize: '15px',
                                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: (loading || (isRegistering && strength < 2)) ? 0.55 : 1,
                                            transition: 'all 0.18s ease',
                                        }}
                                        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 26px rgba(21,138,88,0.42)'; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 18px rgba(21,138,88,0.32)'; }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {loading ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" />{isRegistering ? 'Creando cuenta...' : 'Iniciando sesión...'}</>
                                            ) : (
                                                <>{isRegistering ? 'Crear cuenta ahora' : 'Acceder al Portal'}{!isRegistering && <ArrowRight className="w-4 h-4" />}</>
                                            )}
                                        </span>
                                    </button>
                                </form>
                            </div>

                            {/* Toggle */}
                            <div className="px-8 pb-7 pt-5 text-center" style={{ borderTop: '1px solid #f0f3f5' }}>
                                <button type="button"
                                    onClick={() => { setIsRegistering(!isRegistering); setError(''); setPassword(''); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#9ca3af', transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#22a86e')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                                >
                                    {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                    <span style={{ color: '#158a58', fontWeight: 900 }}>
                                        {isRegistering ? 'Inicia sesión' : 'Regístrate gratis'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
