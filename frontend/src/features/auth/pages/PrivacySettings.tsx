import React, { useState } from 'react';
import { Shield, ShieldAlert, FileText, Trash2, Mail, Loader2 } from 'lucide-react';
import { authApi } from '../../../api';
import toast from 'react-hot-toast';

export default function PrivacySettings() {
    const [loadingRevoke, setLoadingRevoke] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);
    const [loadingPqrs, setLoadingPqrs] = useState(false);
    
    const [pqrsSubject, setPqrsSubject] = useState('');
    const [pqrsMessage, setPqrsMessage] = useState('');

    const handleRevoke = async () => {
        if (!confirm('¿Estás seguro de que deseas revocar la autorización? Tu cuenta será desactivada y ya no será visible.')) return;
        setLoadingRevoke(true);
        try {
            const { data } = await authApi.post('/privacy/revoke', { reason: 'Revocatoria voluntaria' });
            toast.success(data.message);
            setTimeout(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al revocar autorización');
        } finally {
            setLoadingRevoke(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Esta acción es IRREVERSIBLE. ¿Deseas solicitar la supresión de todos tus datos personales del sistema?')) return;
        setLoadingDelete(true);
        try {
            const { data } = await authApi.post('/privacy/delete-account');
            toast.success(data.message);
            setTimeout(() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al suprimir cuenta');
        } finally {
            setLoadingDelete(false);
        }
    };

    const handlePqrsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingPqrs(true);
        try {
            const { data } = await authApi.post('/privacy/pqrs', { subject: pqrsSubject, message: pqrsMessage });
            toast.success(data.message);
            setPqrsSubject('');
            setPqrsMessage('');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Error al enviar la consulta');
        } finally {
            setLoadingPqrs(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-3xl p-8 border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Gestión de Privacidad (Ley 1581)</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ejerce tus derechos de Habeas Data</p>
                    </div>
                </div>
                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                    <p>
                        Como titular de datos personales, tienes derecho a conocer, actualizar y rectificar tu información, 
                        así como a revocar la autorización o solicitar la supresión de tus datos del sistema institucional de la Universidad Popular del Cesar.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Consultas y Reclamos (PQRS) */}
                <div className="rounded-3xl p-6 border shadow-sm md:col-span-2 transition-colors" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Consultas y Reclamos</h2>
                    </div>
                    <form onSubmit={handlePqrsSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Asunto</label>
                            <input 
                                type="text" 
                                value={pqrsSubject} 
                                onChange={(e) => setPqrsSubject(e.target.value)} 
                                required
                                className="w-full p-3 rounded-xl border focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                placeholder="Ej: Actualización de documento"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Mensaje</label>
                            <textarea 
                                value={pqrsMessage} 
                                onChange={(e) => setPqrsMessage(e.target.value)} 
                                required
                                rows={4}
                                className="w-full p-3 rounded-xl border focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all resize-none"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                placeholder="Describe tu consulta o reclamo relacionado con tus datos personales..."
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loadingPqrs}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loadingPqrs ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            Radicar Solicitud
                        </button>
                    </form>
                </div>

                {/* Revocar Autorización */}
                <div className="rounded-3xl p-6 border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Revocar Autorización</h2>
                    </div>
                    <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Retira tu consentimiento para el tratamiento de datos. Tu cuenta será desactivada de inmediato y ya no podrás acceder a las oportunidades del portal.
                    </p>
                    <button 
                        onClick={handleRevoke}
                        disabled={loadingRevoke}
                        className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
                    >
                        {loadingRevoke && <Loader2 className="w-4 h-4 animate-spin" />}
                        Revocar y Desactivar Cuenta
                    </button>
                </div>

                {/* Suprimir Cuenta */}
                <div className="rounded-3xl p-6 border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Suprimir Datos Personales</h2>
                    </div>
                    <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Solicita la eliminación definitiva de tus datos personales del sistema. Esta acción es irreversible y anonimizará toda tu información.
                    </p>
                    <button 
                        onClick={handleDeleteAccount}
                        disabled={loadingDelete}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors"
                    >
                        {loadingDelete && <Loader2 className="w-4 h-4 animate-spin" />}
                        Suprimir Mi Cuenta
                    </button>
                </div>

            </div>
        </div>
    );
}
