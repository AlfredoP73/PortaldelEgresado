import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { graduatesApi } from '../../../api';
import { UserCircle, GraduationCap, Briefcase, ChevronRight, ChevronLeft, Check, Loader2, Camera, FileText, Upload } from 'lucide-react';

interface ProfileWizardProps {
  initialProfile: any;
  programs: any[];
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Datos Básicos', icon: UserCircle },
  { id: 2, title: 'Documentos', icon: FileText },
  { id: 3, title: 'Formación', icon: GraduationCap },
  { id: 4, title: 'Experiencia', icon: Briefcase },
];

export default function ProfileWizard({ initialProfile, programs, onClose, onComplete }: ProfileWizardProps) {
    const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // -- Step 1 State --
  const [profileData, setProfileData] = useState({
    first_name: initialProfile?.first_name || '',
    last_name: initialProfile?.last_name || '',
    program_id: initialProfile?.program_id || '',
    graduation_year: initialProfile?.graduation_year || '',
    phone: initialProfile?.phone || '',
    profile_summary: initialProfile?.profile_summary || '',
  });

  // -- Step 2 State --
  const [cvUrl, setCvUrl] = useState<string | null>(initialProfile?.cv_url || null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(initialProfile?.profile_picture_url || null);

  // -- Step 3 State --
  const [education, setEducation] = useState({
    institution: '',
    degree: '',
    start_date: '',
    end_date: ''
  });

  // -- Step 4 State --
  const [experience, setExperience] = useState({
    company_name: '',
    position: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL !== undefined ? import.meta.env.VITE_GRADUATES_URL : 'http://localhost:8003';

  // --- Handlers ---
  const handleSaveStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await graduatesApi.post('/profile', {
        ...profileData,
        program_id: Number(profileData.program_id),
        graduation_year: Number(profileData.graduation_year),
      });
      setStep(2);
      toast.success('Datos básicos guardados');
    } catch (error) {
      toast.error('Error al guardar datos básicos');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      const res = await graduatesApi.post('/profile/picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPictureUrl(res.data.profile_picture_url);
      toast.success('Foto subida');
    } catch (error) {
      toast.error('Error al subir foto');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      const res = await graduatesApi.post('/cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCvUrl(res.data.cv_url);
      toast.success('CV subido');
    } catch (error) {
      toast.error('Error al subir CV');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!education.institution) {
      setStep(4); // User skipped adding education
      return;
    }
    try {
      setLoading(true);
      const res = await graduatesApi.post('/academic_histories', {
        ...education,
        end_date: education.end_date || null
      });

      if (diplomaFile) {
        const fd = new FormData();
        fd.append('file', diplomaFile);
        await graduatesApi.post(`/education/${res.data.id}/diploma`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setStep(4);
      toast.success('Formación académica guardada');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar formación');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experience.company_name) {
      onComplete(); // User skipped adding experience
      return;
    }
    try {
      setLoading(true);
      const res = await graduatesApi.post('/experiences', {
        ...experience,
        end_date: experience.end_date || null
      });

      if (certFile) {
        const fd = new FormData();
        fd.append('file', certFile);
        await graduatesApi.post(`/experiences/${res.data.id}/certificate`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      toast.success('Experiencia laboral guardada');
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar experiencia');
    } finally {
      setLoading(false);
    }
  };

  // --- Renders ---
  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fade-in-up">
      {/* Header & Close */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Completar Hoja de Vida</h2>
          <p className="text-slate-500 mt-1">Completa tu perfil paso a paso para destacar.</p>
        </div>
        <button onClick={onClose} className="btn-ghost" title={'Cancelar'}>
          Completar después
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-500 rounded-full z-0 transition-all duration-500"
             style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}></div>
        
        {STEPS.map((s) => {
          const active = step >= s.id;
          const isPast = step > s.id;
          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold ${active ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-slate-100 text-slate-400 border-[3px] border-white'}`}>
                {isPast ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</span>
            </div>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="card p-8 bg-white shadow-sm border border-slate-100 rounded-2xl">
        
        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleSaveStep1} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><UserCircle className="text-brand-500"/> 1. {'Datos Personales'}</h3>
            <div className="grid grid-cols-2 gap-5">
              <div><label className="form-label">{'Nombres'}</label><input type="text" className="input" required value={profileData.first_name} onChange={e=>setProfileData({...profileData, first_name: e.target.value})} /></div>
              <div><label className="form-label">{'Apellidos'}</label><input type="text" className="input" required value={profileData.last_name} onChange={e=>setProfileData({...profileData, last_name: e.target.value})} /></div>
              <div>
                <label className="form-label">Programa Egresado</label>
                <select className="input" required value={profileData.program_id} onChange={e=>setProfileData({...profileData, program_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Año de Graduación</label><input type="number" className="input" required min="1980" max="2030" value={profileData.graduation_year} onChange={e=>setProfileData({...profileData, graduation_year: e.target.value})} /></div>
            </div>
            <div><label className="form-label">{'Teléfono'}</label><input type="text" className="input" value={profileData.phone} onChange={e=>setProfileData({...profileData, phone: e.target.value})} /></div>
            <div><label className="form-label">Resumen Profesional (Opcional)</label><textarea className="input" rows={3} value={profileData.profile_summary} onChange={e=>setProfileData({...profileData, profile_summary: e.target.value})} placeholder="Escribe un breve resumen de tu perfil profesional..." /></div>
            <div className="flex justify-end pt-4"><button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">{loading ? <Loader2 className="animate-spin w-4 h-4"/> : 'Guardar y Continuar'} <ChevronRight className="w-4 h-4" /></button></div>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-brand-500"/> 2. Documentos y Foto</h3>
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Foto */}
              <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-200 mb-4 flex items-center justify-center border-4 border-white shadow-md relative">
                   {pictureUrl ? <img src={`${GRADUATES_URL}${pictureUrl}`} alt="Foto" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-slate-400" />}
                </div>
                <h4 className="font-bold text-slate-800 mb-1">{'Foto de perfil'}</h4>
                <p className="text-xs text-slate-500 mb-4">Sube una foto profesional de frente (JPG o PNG)</p>
                <input type="file" id="foto-up" className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                <label htmlFor="foto-up" className="btn-ghost cursor-pointer text-sm w-full"><Upload className="w-4 h-4 inline-block mr-2"/>Subir Foto</label>
              </div>

              {/* CV */}
              <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-emerald-50 mb-4 flex items-center justify-center border-4 border-white shadow-md">
                   {cvUrl ? <FileText className="w-10 h-10 text-emerald-500" /> : <Upload className="w-8 h-8 text-emerald-300" />}
                </div>
                <h4 className="font-bold text-slate-800 mb-1">Hoja de Vida (CV)</h4>
                <p className="text-xs text-slate-500 mb-4">Sube tu hoja de vida completa en formato PDF</p>
                <input type="file" id="cv-up" className="hidden" accept=".pdf" onChange={handleUploadCV} />
                <label htmlFor="cv-up" className="btn-ghost cursor-pointer text-sm w-full"><Upload className="w-4 h-4 inline-block mr-2"/>{cvUrl ? 'Actualizar CV' : 'Subir Archivo PDF'}</label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
               <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</button>
               <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2">Siguiente Paso <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleSaveStep3} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><GraduationCap className="text-brand-500"/> 3. {'Educación'}</h3>
            <p className="text-sm text-slate-500 mb-6">Si has realizado estudios adicionales (postgrados, maestrías, diplomados), puedes agregarlos aquí. Si no, presiona "Omitir".</p>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2"><label className="form-label">{'Institución'}</label><input type="text" className="input" placeholder={'Ej: Universidad Popular del Cesar'} value={education.institution} onChange={e=>setEducation({...education, institution: e.target.value})} /></div>
              <div className="col-span-2"><label className="form-label">{'Título obtenido'}</label><input type="text" className="input" placeholder={'Ej: Especialista en...'} value={education.degree} onChange={e=>setEducation({...education, degree: e.target.value})} /></div>
              <div><label className="form-label">{'Fecha de inicio'}</label><input type="date" className="input" value={education.start_date} onChange={e=>setEducation({...education, start_date: e.target.value})} /></div>
              <div><label className="form-label">Fecha de fin (Dejar vacío si sigue cursando)</label><input type="date" className="input" value={education.end_date} onChange={e=>setEducation({...education, end_date: e.target.value})} /></div>
              <div className="col-span-2 pt-2">
                <label className="form-label">Diploma (PDF, opcional)</label>
                <div className="flex items-center gap-4">
                  <input type="file" id="diploma-up" className="hidden" accept=".pdf" onChange={e => setDiplomaFile(e.target.files?.[0] || null)} />
                  <label htmlFor="diploma-up" className="btn-ghost cursor-pointer py-2 px-4 flex items-center justify-center gap-2 w-full border-dashed border-2">
                     <Upload className="w-4 h-4 text-slate-400" /> 
                     <span className="text-slate-600 font-medium">{diplomaFile ? diplomaFile.name : 'Subir diploma o certificado de estudio'}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-6 border-t border-slate-100">
               <button type="button" onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</button>
               <div className="flex gap-3">
                 <button type="button" onClick={() => setStep(4)} className="btn-ghost">{'Omitir este paso'}</button>
                 <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">{loading ? <Loader2 className="animate-spin w-4 h-4"/> : 'Guardar y Continuar'} <ChevronRight className="w-4 h-4" /></button>
               </div>
            </div>
          </form>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <form onSubmit={handleSaveStep4} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Briefcase className="text-brand-500"/> 4. {'Experiencia'}</h3>
            <p className="text-sm text-slate-500 mb-6">Añade tu experiencia más reciente. Si aún no tienes experiencia, presiona "Omitir y Finalizar".</p>
            
            <div className="grid grid-cols-2 gap-5">
              <div><label className="form-label">{'Empresa'}</label><input type="text" className="input" placeholder={'Ej: Microsoft, Alcaldía...'} value={experience.company_name} onChange={e=>setExperience({...experience, company_name: e.target.value})} /></div>
              <div><label className="form-label">{'Cargo'}</label><input type="text" className="input" placeholder={'Ej: Ingeniero de Software'} value={experience.position} onChange={e=>setExperience({...experience, position: e.target.value})} /></div>
              <div><label className="form-label">{'Fecha de inicio'}</label><input type="date" className="input" value={experience.start_date} onChange={e=>setExperience({...experience, start_date: e.target.value})} /></div>
              <div><label className="form-label">Fecha de fin (Dejar vacío si es actual)</label><input type="date" className="input" value={experience.end_date} onChange={e=>setExperience({...experience, end_date: e.target.value})} /></div>
              <div className="col-span-2"><label className="form-label">{'Descripción de funciones'}</label><textarea className="input" rows={3} value={experience.description} onChange={e=>setExperience({...experience, description: e.target.value})} /></div>
              <div className="col-span-2 pt-2">
                <label className="form-label">Certificado Laboral (PDF, opcional)</label>
                <div className="flex items-center gap-4">
                  <input type="file" id="cert-up" className="hidden" accept=".pdf" onChange={e => setCertFile(e.target.files?.[0] || null)} />
                  <label htmlFor="cert-up" className="btn-ghost cursor-pointer py-2 px-4 flex items-center justify-center gap-2 w-full border-dashed border-2">
                     <Upload className="w-4 h-4 text-slate-400" /> 
                     <span className="text-slate-600 font-medium">{certFile ? certFile.name : 'Subir certificado laboral en PDF'}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-6 border-t border-slate-100">
               <button type="button" onClick={() => setStep(3)} className="btn-ghost flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</button>
               <div className="flex gap-3">
                 <button type="button" onClick={onComplete} className="btn-ghost text-brand-600 font-bold">Omitir y Finalizar</button>
                 <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"><Check className="w-4 h-4"/> {loading ? 'Guardando...' : 'Finalizar Registro'}</button>
               </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
