import { useState } from 'react';
import { ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { authApi } from '../api';

interface PrivacyBlockerProps {
    onAccepted: () => void;
}

export default function PrivacyBlocker({ onAccepted }: PrivacyBlockerProps) {
    const [loading, setLoading] = useState(false);
    const [acceptPrivacy, setAcceptPrivacy] = useState(false);
    const [authorizeData, setAuthorizeData] = useState(false);
    const [error, setError] = useState('');

    const handleAccept = async () => {
        if (!acceptPrivacy || !authorizeData) {
            setError("Debes aceptar ambas casillas para continuar.");
            return;
        }
        setLoading(true);
        try {
            await authApi.post('/privacy/accept-policy');
            
            // Actualizar localstorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.privacy_policy_accepted = true;
                user.data_treatment_authorized = true;
                localStorage.setItem('user', JSON.stringify(user));
            }
            onAccepted();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ocurrió un error. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 animate-fade-in-up">
                
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <ShieldAlert className="w-8 h-8 text-brand-600" />
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 text-center mb-2">Actualización de Políticas</h1>
                <p className="text-slate-500 text-sm text-center mb-8">
                    Para continuar usando el Portal de Egresados, debes aceptar nuestras políticas de privacidad y tratamiento de datos actualizadas.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4 mb-8">
                    <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors bg-slate-50 hover:bg-brand-50/30">
                        <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer" />
                        <span className="text-[13px] text-slate-600 leading-relaxed">
                            He leído y acepto el <a href="/aviso-privacidad" target="_blank" className="text-brand-600 hover:underline font-semibold" onClick={e=>e.stopPropagation()}>Aviso de Privacidad</a> de la Universidad Popular del Cesar.
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group p-4 rounded-xl border border-slate-100 hover:border-brand-200 transition-colors bg-slate-50 hover:bg-brand-50/30">
                        <input type="checkbox" checked={authorizeData} onChange={e => setAuthorizeData(e.target.checked)} className="mt-0.5 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer" />
                        <span className="text-[13px] text-slate-600 leading-relaxed">
                            Autorizo el <a href="/tratamiento-datos" target="_blank" className="text-brand-600 hover:underline font-semibold" onClick={e=>e.stopPropagation()}>Tratamiento de mis Datos Personales</a> conforme a la Ley 1581 de 2012.
                        </span>
                    </label>
                </div>

                <button 
                    onClick={handleAccept}
                    disabled={loading || !acceptPrivacy || !authorizeData}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all"
                    style={{
                        background: 'linear-gradient(135deg, #22a86e 0%, #0e4832 100%)',
                        opacity: (loading || !acceptPrivacy || !authorizeData) ? 0.5 : 1,
                        cursor: (loading || !acceptPrivacy || !authorizeData) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Aceptar y Continuar
                </button>

            </div>
        </div>
    );
}
