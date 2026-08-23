import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { graduatesApi } from '../../../api';
import api from '../../../api';
import {
  Edit2, GraduationCap, Mail, Award,
  Upload, FileText, Loader2, Camera, Phone, Briefcase,
  Star, Plus, X, Check
} from 'lucide-react';
import ProfileCompleteness from '../components/ProfileCompleteness';
import ProfileWizard from '../components/ProfileWizard';
const GRADUATES_URL = import.meta.env.VITE_GRADUATES_URL || 'http://localhost:8003';

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
  const navigate = useNavigate();
  
  const handleCompletenessAction = (actionId: string) => {
    switch (actionId) {
      case 'basic': setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'photo': document.getElementById('avatar-upload')?.click(); break;
      case 'cv': document.getElementById('cv-upload')?.click(); break;
      case 'skills': setIsEditingSkills(true); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100); break;
      case 'exp': navigate('/graduate/experience'); break;
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
      setProfile(profileRes.data);
      if (profileRes.data?.skills) setSelectedSkills(profileRes.data.skills.map((s: any) => s.skill_id));
      setPrograms(programsRes.data);
      setAvailableSkills(skillsRes.data);
      if (!profileRes.data) setIsEditing(true);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: '#45c388', background: 'rgba(34,168,110,0.15)', border: '1px solid rgba(34,168,110,0.3)' }}>
              GRADUATE
            </span>
          </div>
        </div>

        <div className="px-8 pb-8">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-14 mb-4 relative z-10">
            <div className="flex items-end gap-5">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center font-black text-3xl text-white"
                  style={{ background: 'linear-gradient(135deg, #22a86e, #0e4832)', border: '4px solid var(--bg-surface)' }}>
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
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white" style={{ background: '#22a86e' }} />
              </div>
            </div>

            {/* CV actions */}
            <div className="flex items-center gap-2 pb-1">
              {profile.cv_url && (
                <a href={`${GRADUATES_URL}${profile.cv_url}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
                  style={{ color: '#158a58', background: '#eefbf4', border: '1px solid #b0eacb' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#d6f5e3')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#eefbf4')}>
                  <FileText className="w-4 h-4" /> Ver Hoja de Vida
                </a>
              )}
              <div>
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
    </div>
  );
}