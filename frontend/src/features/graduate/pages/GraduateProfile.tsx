import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { graduatesApi, parseCvPdf } from '../../../api';
import api from '../../../api';
import {
  Edit2, GraduationCap, Mail, Award,
  Upload, FileText, Loader2, Camera, Phone, Briefcase,
  Star, Plus, X, Check, Sparkles, Bell, DollarSign, Clock, Globe,
  Sliders, FileSearch, Users, CheckCircle2, ShieldCheck
} from 'lucide-react';
import ProfileCompleteness from '../components/ProfileCompleteness';
import ProfileWizard from '../components/ProfileWizard';
import { CVDocument } from '../components/CVDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
const GRADUATES_URL = (import.meta.env.VITE_GRADUATES_URL ?? '');

interface WorkExperience {
  id: number;
  company_name: string;
  position: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

interface AcademicHistory {
  id: number;
  institution: string;
  degree: string;
  start_date: string;
  end_date?: string;
}

interface Graduate {
  user_id: number;
  first_name: string;
  last_name: string;
  program_id: number;
  graduation_year: number;
  phone?: string;
  cv_url?: string;
  profile_picture_url?: string;
  profile_summary?: string;
  availability_status?: string;
  preferred_modality?: string;
  availability_notice?: string;
  expected_salary?: number;
  job_alerts_enabled?: boolean;
  alert_min_score?: number;
  directory_visible?: boolean;
  experiences: WorkExperience[];
  academic_histories: AcademicHistory[];
  skills: { skill_id: number; proficiency_level: string }[];
}

interface Program { id: number; name: string }
interface Skill { id: number; name: string }

export default function GraduateProfile() {
  const [profile, setProfile] = useState<Graduate | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [uploadingCV, setUploadingCV] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Career Preferences & #OpenToWork state
  const [availabilityStatus, setAvailabilityStatus] = useState('OPEN_TO_WORK');
  const [preferredModality, setPreferredModality] = useState('Cualquiera');
  const [availabilityNotice, setAvailabilityNotice] = useState('Inmediata');
  const [expectedSalary, setExpectedSalary] = useState<string>('');
  const [jobAlertsEnabled, setJobAlertsEnabled] = useState(true);
  const [alertMinScore, setAlertMinScore] = useState<number>(75);
  const [directoryVisible, setDirectoryVisible] = useState<boolean>(true);

  // CV Parser state
  const [parsingCv, setParsingCv] = useState(false);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [applyingParsed, setApplyingParsed] = useState(false);

  const navigate = useNavigate();
  
  const handleCompletenessAction = (actionId: string) => {
    switch (actionId) {
      case 'basic': setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'photo': document.getElementById('avatar-upload')?.click(); break;
      case 'cv': document.getElementById('cv-upload')?.click(); break;
      case 'skills': setIsEditingSkills(true); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); break;
      case 'exp': navigate('/experience'); break;
      case 'preferences': document.getElementById('preferences-card')?.scrollIntoView({ behavior: 'smooth' }); break;
    }
  };

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, programsRes, skillsRes] = await Promise.all([
        graduatesApi.get('/profile').catch(() => ({ data: null })),
        api.get('/programs'),
        graduatesApi.get('/skills').catch(() => ({ data: [] })),
      ]);
      const data = profileRes.data;
      setProfile(data);
      if (data) {
        if (data.skills) setSelectedSkills(data.skills.map((s: any) => s.skill_id));
        setAvailabilityStatus(data.availability_status || 'OPEN_TO_WORK');
        setPreferredModality(data.preferred_modality || 'Cualquiera');
        setAvailabilityNotice(data.availability_notice || 'Inmediata');
        setExpectedSalary(data.expected_salary ? String(data.expected_salary) : '');
        setJobAlertsEnabled(data.job_alerts_enabled !== undefined ? Boolean(data.job_alerts_enabled) : true);
        setAlertMinScore(data.alert_min_score !== undefined ? Number(data.alert_min_score) : 75);
        setDirectoryVisible(data.directory_visible !== undefined ? Boolean(data.directory_visible) : true);
      }
      setPrograms(programsRes.data);
      setAvailableSkills(skillsRes.data);
      if (!data) setIsEditing(true);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile) return;
    try {
      setSavingPreferences(true);
      const payload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        program_id: profile.program_id,
        graduation_year: profile.graduation_year,
        phone: profile.phone,
        profile_summary: profile.profile_summary,
        availability_status: availabilityStatus,
        preferred_modality: preferredModality,
        availability_notice: availabilityNotice,
        expected_salary: expectedSalary ? Number(expectedSalary) : null,
        job_alerts_enabled: jobAlertsEnabled,
        alert_min_score: alertMinScore,
        directory_visible: directoryVisible,
      };
      const res = await graduatesApi.post('/profile', payload);
      setProfile(res.data);
      toast.success('Preferencias de empleo, alertas y visibilidad actualizadas');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al actualizar preferencias laborales');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleParseCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Solo se admiten documentos PDF para la extracción');
      return;
    }
    try {
      setParsingCv(true);
      const res = await parseCvPdf(file);
      const data = res.data;
      setParsedData({
        phone: data.phone || profile?.phone || '',
        profile_summary: data.profile_summary || profile?.profile_summary || '',
        skills: data.skills || [],
        experiences: data.experiences || [],
        academic_histories: data.academic_histories || []
      });
      setShowParseModal(true);
      toast.success('CV analizado con éxito mediante reglas determinísticas UPC');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al analizar el CV por reglas');
    } finally {
      setParsingCv(false);
      e.target.value = '';
    }
  };

  const handleApplyParsedData = async () => {
    if (!parsedData || !profile) return;
    try {
      setApplyingParsed(true);
      // 1. Update basic profile summary & phone
      await graduatesApi.post('/profile', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        program_id: profile.program_id,
        graduation_year: profile.graduation_year,
        phone: parsedData.phone || profile.phone,
        profile_summary: parsedData.profile_summary || profile.profile_summary,
        availability_status: availabilityStatus,
        preferred_modality: preferredModality,
        availability_notice: availabilityNotice,
        expected_salary: expectedSalary ? Number(expectedSalary) : null,
        job_alerts_enabled: jobAlertsEnabled,
        alert_min_score: alertMinScore,
        directory_visible: directoryVisible,
      });

      // 2. Add matched skills
      if (parsedData.skills && parsedData.skills.length > 0) {
        const newSkillIds = parsedData.skills.map((s: any) => s.skill_id);
        const combinedSkillIds = Array.from(new Set([...selectedSkills, ...newSkillIds]));
        await graduatesApi.put('/profile/skills', {
          skills: combinedSkillIds.map(id => ({ skill_id: id, proficiency_level: 'Intermedio' }))
        });
      }

      // 3. Add extracted experiences
      if (parsedData.experiences && parsedData.experiences.length > 0) {
        for (const exp of parsedData.experiences) {
          try {
            await graduatesApi.post('/experiences', {
              company_name: exp.company_name || 'Empresa',
              position: exp.position || 'Profesional',
              start_date: exp.start_date || '2023-01-01',
              end_date: exp.end_date || null,
              description: exp.description || ''
            });
          } catch (e) {
            console.warn('Experience skip:', e);
          }
        }
      }

      // 4. Add extracted education
      if (parsedData.academic_histories && parsedData.academic_histories.length > 0) {
        for (const edu of parsedData.academic_histories) {
          try {
            await graduatesApi.post('/academic_histories', {
              institution: edu.institution || 'Universidad',
              degree: edu.degree || 'Título',
              start_date: edu.start_date || '2019-01-01',
              end_date: edu.end_date || null
            });
          } catch (e) {
            console.warn('Education skip:', e);
          }
        }
      }

      toast.success('¡Datos del CV aplicados con éxito a tu perfil!');
      setShowParseModal(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar los datos extraídos');
    } finally {
      setApplyingParsed(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Solo se permiten archivos PDF'); return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingCV(true);
      const res = await graduatesApi.post('/cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => prev ? { ...prev, cv_url: res.data.cv_url } : null);
      toast.success('Hoja de vida subida exitosamente');
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast.error('Error al subir la hoja de vida');
    } finally {
      setUploadingCV(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Solo se permiten imágenes (JPG, PNG, WEBP)'); return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await graduatesApi.post('/profile/picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => prev ? { ...prev, profile_picture_url: res.data.profile_picture_url } : null);
      toast.success('Foto de perfil actualizada exitosamente');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la foto de perfil');
    }
  };

  const handleSaveSkills = async () => {
    try {
      await graduatesApi.put('/profile/skills', { skills: selectedSkills.map(id => ({ skill_id: id, proficiency_level: 'Intermedio' })) });
      toast.success('Habilidades actualizadas exitosamente');
      setIsEditingSkills(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar habilidades');
    }
  };

  const handleAddCustomSkill = async () => {
    if (!newSkillName.trim()) return;
    try {
      const res = await graduatesApi.post('/skills', { name: newSkillName.trim() });
      setAvailableSkills([...availableSkills, res.data]);
      setSelectedSkills([...selectedSkills, res.data.id]);
      setNewSkillName('');
      toast.success('Habilidad añadida al catálogo');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al añadir habilidad');
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  /* ── Edit form (Wizard) ── */
  if (isEditing || !profile) {
    return (
      <ProfileWizard 
        initialProfile={profile} 
        programs={programs} 
        onClose={() => setIsEditing(false)} 
        onComplete={() => {
          setIsEditing(false);
          fetchProfile();
        }} 
      />
    );
  }

  const programName = programs.find(p => p.id === profile.program_id)?.name || 'Programa Desconocido';

  /* ── Profile initials ── */
  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  const statusMeta = availabilityStatus === 'OPEN_TO_WORK'
    ? { label: '#OpenToWork · Buscando empleo activamente', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' }
    : availabilityStatus === 'OPEN_TO_OFFERS'
    ? { label: 'Abierto a escuchar ofertas', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' }
    : { label: 'No busco empleo por ahora', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.35)' };

  return (
    <div className="space-y-6 w-full">

      {/* Completeness widget */}
      {!isEditing && <ProfileCompleteness profile={profile} onAction={handleCompletenessAction} />}

      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="page-title">{'Mi Perfil Profesional'}</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{'Tu presencia pública ante empresas y empleadores'}</p>
        </div>
        <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
          <Edit2 className="w-4 h-4" /> {'Editar Perfil'}
        </button>
      </div>

      {/* ── Hero Card ── */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>

        {/* Cover banner — no grid, pure glows */}
        <div className="relative h-48 overflow-hidden" style={{ background: 'linear-gradient(135deg, #051510 0%, #09291a 30%, #0d3d26 60%, #115040 100%)' }}>
          {/* Ambient glows only */}
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(34,168,110,0.22) 0%, transparent 65%)', filter: 'blur(50px)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(17,112,72,0.2) 0%, transparent 65%)', filter: 'blur(40px)' }} />
          <div className="absolute top-0 left-1/3 w-96 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(69,195,136,0.08) 0%, transparent 65%)', filter: 'blur(35px)' }} />
          <div className="absolute top-4 left-8 right-8 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full" style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Portal Empleo · Universidad UPC
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ color: statusMeta.color, background: 'rgba(0,0,0,0.45)', border: `1px solid ${statusMeta.border}` }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusMeta.color }} />
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className="px-8 pb-8">
          {/* Avatar row */}
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-14 mb-4 relative z-10">
            <div className="flex items-end gap-5">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center font-black text-3xl text-white"
                  style={{
                    background: 'linear-gradient(135deg, #22a86e, #0e4832)',
                    border: availabilityStatus === 'OPEN_TO_WORK' ? '4px solid #10b981' : '4px solid var(--bg-surface)',
                  }}>
                  {profile.profile_picture_url
                    ? <img src={`${GRADUATES_URL}${profile.profile_picture_url}`} alt="Avatar" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <label htmlFor="avatar-upload"
                  className="absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100"
                  style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <Camera className="w-7 h-7 text-white" />
                  <input id="avatar-upload" type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleAvatarUpload} />
                </label>
                {availabilityStatus === 'OPEN_TO_WORK' && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white whitespace-nowrap">
                    #OpenToWork
                  </div>
                )}
              </div>
            </div>

            {/* CV actions */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {profile.cv_url && (
                <a href={`${GRADUATES_URL}${profile.cv_url}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
                  style={{ color: '#158a58', background: '#eefbf4', border: '1px solid #b0eacb' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#d6f5e3')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#eefbf4')}>
                  <FileText className="w-4 h-4" /> Ver Hoja de Vida
                </a>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input id="cv-upload" type="file" className="hidden" accept="application/pdf" onChange={handleCVUpload} />
                <button
                  onClick={() => document.getElementById('cv-upload')?.click()}
                  disabled={uploadingCV}
                  className="btn-outline flex items-center gap-2"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  {uploadingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {'Actualizar CV PDF'}
                </button>

                <input id="cv-parse-upload" type="file" className="hidden" accept="application/pdf" onChange={handleParseCvUpload} />
                <button
                  type="button"
                  onClick={() => document.getElementById('cv-parse-upload')?.click()}
                  disabled={parsingCv}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
                  title="Extrae perfil, habilidades y experiencias usando el motor de reglas determinístico UPC (100% libre de costo)"
                >
                  {parsingCv ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <FileSearch className="w-4 h-4 text-emerald-700" />}
                  {parsingCv ? 'Extrayendo datos...' : 'Autocompletar desde CV'}
                </button>
                {profile && (
                  <PDFDownloadLink
                    document={<CVDocument profile={profile} programName={programName} skills={availableSkills} />}
                    fileName={`CV_${profile.first_name}_${profile.last_name}.pdf`}
                    className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20"
                  >
                    {/* @ts-ignore */}
                    {({ loading }) => (
                      <>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {loading ? 'Generando...' : 'Exportar Perfil a PDF'}
                      </>
                    )}
                  </PDFDownloadLink>
                )}
              </div>
            </div>
          </div>

          {/* Name + program */}
          <div className="mb-6 relative z-10">
            <h3 className="text-3xl font-black tracking-tight text-ink leading-none">
              {profile.first_name} {profile.last_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                {programName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                {profile.graduation_year}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-7 p-5 rounded-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(34,168,110,0.06), rgba(21,138,88,0.04))', border: '1px solid rgba(34,168,110,0.15)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(34,168,110,0.1), transparent)', filter: 'blur(20px)' }} />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(34,168,110,0.15)' }}>
                <Star className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h4 className="label-upper mb-2 text-brand-700">Perfil Profesional</h4>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {profile.profile_summary || (
                    <span className="italic" style={{ color: 'var(--text-muted)' }}>
                      Aún no has añadido un resumen. Agrega uno para destacar ante las empresas.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Info chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { Icon: Mail, label: 'Correo Electrónico', value: user?.email, color: '#3b82f6' },
              { Icon: Phone, label: 'Teléfono', value: profile.phone || 'No especificado', color: '#8b5cf6' },
              { Icon: Award, label: 'Año de Grado', value: String(profile.graduation_year), color: '#f59e0b' },
            ].map(({ Icon, label, value, color }) => (
              <div key={label} className="group flex items-center gap-3 p-4 rounded-2xl transition-all duration-200"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(34,168,110,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(34,168,110,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-main)'; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="label-upper">{label}</p>
                  <p className="text-sm font-semibold truncate mt-0.5" style={{ color: 'var(--text-main)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Disponibilidad #OpenToWork, Preferencias Laborales y Alertas Inteligentes ── */}
      <div id="preferences-card" className="card">
        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #22a86e, #116e48)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-ink leading-none">Estado #OpenToWork, Preferencias y Alertas</h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Configura tu disponibilidad para que las empresas aliadas y el motor de IA te conecten con las vacantes ideales
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
              className="btn-primary text-sm py-2 px-5 flex items-center gap-2 shrink-0"
            >
              {savingPreferences ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar Preferencias
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Estado de Búsqueda
              </label>
              <select
                className="input w-full text-sm font-semibold"
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
              >
                <option value="OPEN_TO_WORK">🟢 #OpenToWork · Buscando activamente</option>
                <option value="OPEN_TO_OFFERS">🔵 Abierto a escuchar ofertas</option>
                <option value="EMPLOYED_CLOSED">⚪ No busco empleo por ahora</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-brand-600" /> Modalidad Preferida
              </label>
              <select
                className="input w-full text-sm font-semibold"
                value={preferredModality}
                onChange={(e) => setPreferredModality(e.target.value)}
              >
                <option value="Cualquiera">Cualquiera (Flexible)</option>
                <option value="Remoto">100% Remoto</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" /> Disponibilidad de Incorporación
              </label>
              <select
                className="input w-full text-sm font-semibold"
                value={availabilityNotice}
                onChange={(e) => setAvailabilityNotice(e.target.value)}
              >
                <option value="Inmediata">Inmediata</option>
                <option value="1 semana">En 1 semana</option>
                <option value="2 semanas">En 2 semanas</option>
                <option value="1 mes">En 1 mes</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-brand-600" /> Aspiración Salarial (COP/mes)
              </label>
              <input
                type="number"
                min={0}
                step={100000}
                placeholder="Ej: 3500000"
                className="input w-full text-sm font-semibold"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
              />
            </div>
          </div>

          {/* Alertas Inteligentes y Umbral */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Alertas Inteligentes de Vacantes y Convocatorias</p>
                  <p className="text-xs text-ink-secondary">
                    Recibe notificaciones automáticas (web y push al móvil) según el nivel de afinidad con tu perfil.
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={jobAlertsEnabled}
                  onChange={(e) => setJobAlertsEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-emerald-600" />
                <span className="text-xs font-bold text-ink">
                  {jobAlertsEnabled ? 'Activadas' : 'Pausadas'}
                </span>
              </label>
            </div>

            {jobAlertsEnabled && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-semibold text-ink">
                    Umbral mínimo de afinidad para disparar alertas:
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={alertMinScore}
                    onChange={(e) => setAlertMinScore(Number(e.target.value))}
                    className="w-full sm:w-48 accent-emerald-600 cursor-pointer"
                  />
                  <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 min-w-[50px] text-center">
                    {alertMinScore}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Directorio de Egresados y Networking */}
          <div
            className="p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Visibilidad en el Directorio de Egresados (Networking)</p>
                <p className="text-xs text-ink-secondary">
                  Permite a otros egresados de tu programa encontrarte para mentorías, alianzas y conexiones profesionales.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={directoryVisible}
                onChange={(e) => setDirectoryVisible(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-blue-600" />
              <span className="text-xs font-bold text-ink">
                {directoryVisible ? 'Visible' : 'Oculto'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Skills Card ── */}
      <div className="card">
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #22a86e, #116e48)' }}>
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-ink leading-none">Mis Habilidades</h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {profile.skills?.length || 0} habilidades registradas
                </p>
              </div>
            </div>
            {!isEditingSkills ? (
              <button onClick={() => setIsEditingSkills(true)} className="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditingSkills(false)} className="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button onClick={handleSaveSkills} className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
            )}
          </div>

          {!isEditingSkills ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills?.length > 0 ? (
                profile.skills.map(s => {
                  const skillName = availableSkills.find(as => as.id === s.skill_id)?.name || `Skill #${s.skill_id}`;
                  return (
                    <span key={s.skill_id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
                      style={{ background: '#eefbf4', color: '#116e48', border: '1px solid #b0eacb' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      {skillName}
                    </span>
                  );
                })
              ) : (
                <div className="w-full py-10 text-center rounded-2xl" style={{ border: '2px dashed var(--border-color)' }}>
                  <Star className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Aún no tienes habilidades registradas</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Añade al menos una para mejorar tu porcentaje de afinidad con las vacantes.</p>
                  <button onClick={() => setIsEditingSkills(true)} className="btn-primary text-sm mt-4 py-2 px-5 flex items-center gap-1.5 mx-auto">
                    <Plus className="w-3.5 h-3.5" /> Añadir habilidades
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
                {availableSkills.map(skill => {
                  const selected = selectedSkills.includes(skill.id);
                  return (
                    <label key={skill.id}
                      className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        border: selected ? '1.5px solid #22a86e' : '1.5px solid var(--border-color)',
                        background: selected ? '#eefbf4' : 'var(--bg-main)',
                      }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: selected ? '#22a86e' : 'var(--border-color)' }}>
                        {selected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <input type="checkbox" className="sr-only" checked={selected}
                        onChange={e => {
                          if (e.target.checked) setSelectedSkills([...selectedSkills, skill.id]);
                          else setSelectedSkills(selectedSkills.filter(id => id !== skill.id));
                        }} />
                      <span className="text-sm font-medium" style={{ color: selected ? '#0e4832' : 'var(--text-main)' }}>{skill.name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-4 rounded-2xl p-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                <p className="text-sm font-bold mb-2.5 text-ink">¿No encuentras tu habilidad?</p>
                <div className="flex gap-2">
                  <input type="text" className="input flex-1" placeholder="Ej: Python, Figma, Power BI..."
                    value={newSkillName} onChange={e => setNewSkillName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSkill(); } }} />
                  <button onClick={handleAddCustomSkill} type="button" className="btn-primary whitespace-nowrap flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Añadir
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal de Confirmación y Revisión de CV Parseado (Motor por Reglas) ── */}
      {showParseModal && parsedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-start justify-between bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    Confirmar Datos Extraídos del CV
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    Motor Heurístico y de Reglas UPC (Sin costos de IA externa ni suscripciones)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowParseModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
                <strong>Revisión previa obligatoria:</strong> Revisa la información identificada en tu documento. Puedes corregir los campos antes de integrarlos permanentemente a tu perfil institucional.
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1.5">
                  Teléfono Detectado
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={parsedData.phone || ''}
                  onChange={(e) => setParsedData({ ...parsedData, phone: e.target.value })}
                  placeholder="Número de contacto"
                />
              </div>

              {/* Resumen Profesional */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1.5">
                  Resumen o Perfil Profesional Detectado
                </label>
                <textarea
                  rows={3}
                  className="input w-full text-sm leading-relaxed"
                  value={parsedData.profile_summary || ''}
                  onChange={(e) => setParsedData({ ...parsedData, profile_summary: e.target.value })}
                  placeholder="Resumen del egresado"
                />
              </div>

              {/* Habilidades Reconocidas */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                  Habilidades Coincidentes con el Catálogo ({parsedData.skills?.length || 0})
                </label>
                {parsedData.skills && parsedData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((sk: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {sk.skill_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No se identificaron habilidades del catálogo en el texto del PDF.</p>
                )}
              </div>

              {/* Experiencias Laborales */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                  Experiencia Laboral Extraída ({parsedData.experiences?.length || 0})
                </label>
                {parsedData.experiences && parsedData.experiences.length > 0 ? (
                  <div className="space-y-3">
                    {parsedData.experiences.map((exp: any, i: number) => (
                      <div key={i} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{exp.position}</p>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {exp.start_date || 'N/D'} {exp.end_date ? `· ${exp.end_date}` : '· Actual'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{exp.company_name}</p>
                        {exp.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No se detectó sección de experiencia laboral estructurada.</p>
                )}
              </div>

              {/* Formación Académica */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                  Educación / Formación Extraída ({parsedData.academic_histories?.length || 0})
                </label>
                {parsedData.academic_histories && parsedData.academic_histories.length > 0 ? (
                  <div className="space-y-3">
                    {parsedData.academic_histories.map((edu: any, i: number) => (
                      <div key={i} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{edu.degree}</p>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {edu.start_date || 'N/D'} {edu.end_date ? `· ${edu.end_date}` : ''}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No se detectó sección de formación académica adicional.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowParseModal(false)}
                className="btn-ghost text-sm px-4 py-2"
                disabled={applyingParsed}
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleApplyParsedData}
                disabled={applyingParsed}
                className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
              >
                {applyingParsed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {applyingParsed ? 'Guardando en Perfil...' : 'Aplicar y Guardar en Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
