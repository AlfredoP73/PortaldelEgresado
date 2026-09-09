import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Briefcase, Calendar, FileText, AlertCircle, Trash2, Star, Clock, UploadCloud, Link as LinkIcon, Building2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import api from '../../../api';
import toast from 'react-hot-toast';

interface ApplicationDetailProps {
  application: any;
  onBack: () => void;
  onUpdate: () => void;
}

const STAGES = [
  { id: 'POSTULADO', label: 'Postulado', desc: 'Ya diste el primer paso', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500', border: 'border-emerald-500' },
  { id: 'EN_EVALUACION', label: 'HdV Vista', desc: 'Revisando tu perfil', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', border: 'border-blue-500' },
  { id: 'ENTREVISTADO', label: 'En Proceso', desc: 'Avanzando en las pruebas', color: 'text-violet-600', bg: 'bg-violet-50', dot: 'bg-violet-500', border: 'border-violet-500' },
  { id: 'FINAL', label: 'Proceso Finalizado', desc: 'Resultado final', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-500', border: 'border-slate-500' },
];

export default function ApplicationDetail({ application, onBack, onUpdate }: ApplicationDetailProps) {
  
  const getStageIndex = (status: string) => {
    switch (status.toUpperCase()) {
      case 'POSTULADO': return 0;
      case 'EN_EVALUACION': return 1;
      case 'ENTREVISTADO': return 2;
      case 'CONTRATADO':
      case 'RECHAZADO': return 3;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(application.status);
  const isFinal = application.status.toUpperCase() === 'CONTRATADO' || application.status.toUpperCase() === 'RECHAZADO';
  const isHired = application.status.toUpperCase() === 'CONTRATADO';
  const finalDesc = isHired ? '¡Felicidades, fuiste contratado!' : 'No fuiste seleccionado esta vez.';
  
  const activeStage = STAGES[currentStageIndex];

  const handleMarkComplete = async (spId: number) => {
    try {
      await api.put(`/sub-processes/${spId}`, { estado: 'completado' });
      toast.success('Prueba marcada como completada');
      onUpdate();
    } catch(e) {
      toast.error('Error al actualizar la prueba');
    }
  };

  return (
    <div className="space-y-8 w-full max-w-[1600px] mx-auto px-4 xl:px-8 animate-fade-in-up">
      <button 
        onClick={onBack}
        className="group flex items-center gap-2 font-bold transition-all w-fit px-4 py-2 rounded-xl shadow-sm hover:shadow-md"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Volver a mis aplicaciones
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: Timeline & Status */}
        <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-6">
          
          {/* Top Status Card */}
          <div 
            className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group relative"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            <div className={twMerge(
              "p-8 text-white relative overflow-hidden transition-colors duration-500",
              isFinal ? (isHired ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-red-600") 
                      : "bg-gradient-to-br from-brand-600 to-brand-500"
            )}>
              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10 flex items-start gap-5">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    {isHired ? 'Contratado' : application.status === 'RECHAZADO' ? 'No seleccionado' : activeStage.label}
                  </h3>
                  <p className="text-white/80 font-medium mt-2 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 opacity-70" /> 
                    Postulado el {new Date(application.application_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-white/90 mt-3 text-sm bg-black/10 px-3 py-1.5 rounded-lg inline-block font-medium backdrop-blur-sm border border-white/10">
                    {isFinal ? finalDesc : activeStage.desc}
                  </p>
                </div>
              </div>
            </div>
            
            {application.status === 'RECHAZADO' && application.rejection_reason && (
              <div className="p-5 bg-red-50 border-b border-red-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-800 mb-1">Motivo de la decisión:</h4>
                  <p className="text-sm text-red-700/90 leading-relaxed">{application.rejection_reason}</p>
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div className="p-8" style={{ background: 'var(--bg-surface)' }}>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Línea de tiempo</h4>
              <div className="relative pl-6 space-y-8">
                {/* Vertical Line */}
                <div className="absolute top-2 bottom-2 left-[11px] w-0.5" style={{ background: 'linear-gradient(to bottom, var(--accent-primary, #10b981) 0%, var(--border-color) 50%, transparent 100%)', opacity: 0.4 }}></div>

                {STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  
                  return (
                    <div key={stage.id} className="relative group/stage">
                      {/* Dot */}
                      <div 
                        className={twMerge(
                          "absolute -left-[30px] w-[18px] h-[18px] rounded-full border-[3px] transition-all duration-300 z-10",
                          isCompleted ? "border-brand-500 bg-brand-500 scale-90" :
                          isCurrent ? `border-brand-500 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.4)]` : ""
                        )}
                        style={{ 
                          backgroundColor: isCompleted ? undefined : 'var(--bg-surface)',
                          borderColor: (!isCompleted && !isCurrent) ? 'var(--border-color)' : undefined 
                        }}
                      >
                        {isCurrent && <div className="absolute inset-[3px] bg-brand-500 rounded-full animate-pulse"></div>}
                      </div>
                      
                      <div className={twMerge(
                        "transition-all duration-300 -mt-1.5",
                        isCurrent ? "opacity-100 translate-x-1" : isCompleted ? "opacity-70" : "opacity-40"
                      )}>
                        <h4 
                          className="font-bold text-base transition-colors"
                          style={{ color: isCurrent ? 'var(--text-main)' : 'var(--text-secondary)' }}
                        >
                          {idx === 3 && isFinal ? application.status : stage.label}
                        </h4>
                        {isCurrent && (
                          <div className={twMerge("mt-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border", stage.bg, stage.color, 'border-transparent shadow-sm')}>
                            {isFinal ? finalDesc : 'Recuerda prepararte bien para tu próxima prueba'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Job Offer Summary */}
            <div 
              className="p-6 m-2 rounded-2xl mb-2 flex items-center justify-between group/job"
              style={{ background: 'var(--bg-muted)', borderTop: '1px solid var(--border-color)' }}
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Candidatura a</p>
                <h4 className="font-bold line-clamp-1" style={{ color: 'var(--text-main)' }}>{application.job_offer?.title}</h4>
                <p className="text-sm font-semibold text-brand-600 flex items-center gap-1.5 mt-1">
                  <Building2 className="w-4 h-4" /> {application.job_offer?.company?.name}
                </p>
              </div>
              
              {!isFinal && (
                <button 
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shrink-0" 
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                  title="Eliminar candidatura"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sub Processes & Details */}
        <div className="flex-1 flex flex-col gap-6">
          <div 
            className="p-8 rounded-3xl shadow-sm h-full hover:shadow-md transition-all duration-300 relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-blue-500"></div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-brand-50 rounded-2xl text-brand-600" style={{ background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' }}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold" style={{ color: 'var(--text-main)' }}>Pruebas y Evaluaciones</h3>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Requerimientos de la empresa para avanzar</p>
              </div>
            </div>
            
            {!application.sub_processes || application.sub_processes.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center py-20 px-4 border-dashed rounded-3xl text-center"
                style={{ background: 'var(--bg-muted)', border: '1px dashed var(--border-color)' }}
              >
                <div 
                  className="w-20 h-20 shadow-sm rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                >
                  <AlertCircle className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Aún no hay pruebas asignadas</h3>
                <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>La empresa te notificará y añadirá pruebas técnicas o entrevistas a medida que avances en el proceso.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {application.sub_processes.map((sp: any, index: number) => (
                  <div 
                    key={sp.id} 
                    className="relative p-6 rounded-3xl hover:shadow-lg transition-all duration-300 group/card animate-fade-in-up"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 px-2.5 py-1 rounded-md" style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}>
                            {sp.tipo.replace('_', ' ')}
                          </span>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                            sp.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 
                            sp.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 
                            sp.estado === 'completado' ? 'bg-blue-100 text-blue-700' : 
                            sp.estado === 'en_progreso' ? 'bg-violet-100 text-violet-700' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {sp.estado === 'en_progreso' ? 'EN PROGRESO' : sp.estado}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xl" style={{ color: 'var(--text-main)' }}>{sp.nombre}</h4>
                      </div>
                      
                      {sp.fecha_limite && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50/80 px-3 py-2 rounded-xl shrink-0">
                          <Clock className="w-4 h-4" />
                          Límite: {new Date(sp.fecha_limite).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    
                    {sp.descripcion && (
                      <p className="text-sm leading-relaxed p-4 rounded-2xl mb-4" style={{ color: 'var(--text-secondary)', background: 'var(--bg-muted)' }}>
                        {sp.descripcion}
                      </p>
                    )}
                    
                    {sp.archivo_respuesta && (
                      <div className="mb-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-emerald-800">Entregable subido con éxito</span>
                            <a href={sp.archivo_respuesta} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 w-fit">
                              <FileText className="w-3 h-3" /> Ver archivo adjunto
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {sp.score !== undefined && sp.score !== null && (
                      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-amber-50 to-amber-100/50 w-full p-4 rounded-2xl border border-amber-200/60">
                        <span className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          Calificación del Reclutador:
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`w-5 h-5 transition-transform hover:scale-110 ${
                                sp.score >= star 
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                                  : 'fill-white text-amber-200'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 pt-5 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                      
                      {sp.enlace_adjunto && (
                        sp.estado === 'pendiente' ? (
                          <button 
                            onClick={async () => {
                              try {
                                await api.put(`/sub-processes/${sp.id}`, { estado: 'en_progreso' });
                                window.open(sp.enlace_adjunto, '_blank');
                                toast.success('Prueba iniciada. El reclutador ha sido notificado.');
                                onUpdate();
                              } catch(e) { toast.error('Error al iniciar prueba'); }
                            }}
                            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" /> Empezar Prueba
                          </button>
                        ) : (
                          <a href={sp.enlace_adjunto} target="_blank" rel="noreferrer" className="text-brand-600 hover:bg-brand-50 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" /> Volver a abrir enlace
                          </a>
                        )
                      )}
                      
                      {(sp.estado === 'pendiente' || sp.estado === 'en_progreso') && (
                        <label 
                          className="cursor-pointer text-sm font-bold py-2 px-5 rounded-xl transition-all inline-flex items-center justify-center gap-2 group/upload hover:border-brand-500 hover:text-brand-600"
                          style={{ background: 'var(--bg-surface)', border: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}
                        >
                          <UploadCloud className="w-4 h-4 transition-colors" style={{ color: 'var(--text-muted)' }} />
                          {sp.archivo_respuesta ? 'Reemplazar Archivo' : 'Subir Archivo'}
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                  await api.post(`/sub-processes/${sp.id}/upload`, formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                  });
                                  toast.success('Archivo subido con éxito');
                                  onUpdate();
                                } catch (error) {
                                  toast.error('Error al subir el archivo');
                                }
                              }
                            }}
                          />
                        </label>
                      )}
                      
                      {(sp.estado === 'pendiente' || sp.estado === 'en_progreso') && (
                        <button 
                          onClick={() => handleMarkComplete(sp.id)}
                          className="ml-auto text-sm font-bold py-2.5 px-5 rounded-xl transition-colors hover:text-brand-600"
                          style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}
                        >
                          Ya la completé
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
