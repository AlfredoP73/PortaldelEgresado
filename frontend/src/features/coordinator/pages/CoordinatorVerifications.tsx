import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileBadge,
  GraduationCap,
  Mail,
  Phone,
  IdCard,
  Eye,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  getCoordinatorVerifications,
  approveGraduateVerification,
  rejectGraduateVerification,
} from '../../../api';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';

interface VerificationItem {
  user_id: number;
  email: string;
  email_verified: boolean;
  is_active: boolean;
  created_at?: string | null;
  first_name: string;
  last_name: string;
  document_id?: string | null;
  program_id: number;
  program_name: string;
  graduation_year: number;
  degree_act_number?: string | null;
  diploma_number?: string | null;
  phone?: string | null;
  cv_url?: string | null;
  verification_status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | string;
  verification_notes?: string | null;
  verified_at?: string | null;
}

interface SummaryCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function CoordinatorVerifications() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [programs, setPrograms] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_VERIFICATION');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<VerificationItem | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchVerifications = async (overrideStatus?: string) => {
    try {
      setLoading(true);
      const effectiveStatus = overrideStatus ?? statusFilter;
      const params: any = {};
      if (effectiveStatus && effectiveStatus !== 'ALL') params.status = effectiveStatus;
      if (programFilter) params.program_id = Number(programFilter);
      if (yearFilter) params.graduation_year = Number(yearFilter);
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await getCoordinatorVerifications(params);
      const data = res.data || {};
      setSummary(data.summary || { pending: 0, approved: 0, rejected: 0, total: 0 });
      setPrograms(data.programs || []);
      setItems(data.items || []);

      // Si en la primera carga no hay pendientes y el filtro estaba en PENDING_VERIFICATION, mostrar todos
      if (
        overrideStatus === undefined &&
        effectiveStatus === 'PENDING_VERIFICATION' &&
        (data.summary?.pending || 0) === 0 &&
        (data.items || []).length === 0 &&
        (data.summary?.total || 0) > 0
      ) {
        setStatusFilter('ALL');
        const allRes = await getCoordinatorVerifications({
          ...(programFilter ? { program_id: Number(programFilter) } : {}),
          ...(yearFilter ? { graduation_year: Number(yearFilter) } : {}),
          ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
        });
        setItems(allRes.data?.items || []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudieron cargar las solicitudes de verificación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, programFilter, yearFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVerifications();
  };

  const handleApprove = async (item: VerificationItem, notes?: string) => {
    try {
      setProcessingId(item.user_id);
      const res = await approveGraduateVerification(item.user_id, notes);
      toast.success(res.data?.message || `Egresado ${item.first_name} ${item.last_name} aprobado.`);
      setSelectedItem(null);
      setDecisionNotes('');
      await fetchVerifications();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al aprobar la verificación.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!decisionNotes.trim()) {
      toast.error('Indica el motivo u observación para que el egresado pueda corregir sus datos.');
      return;
    }
    try {
      setProcessingId(rejectingItem.user_id);
      const res = await rejectGraduateVerification(rejectingItem.user_id, decisionNotes.trim());
      toast.success(res.data?.message || 'Observación enviada al egresado.');
      setRejectingItem(null);
      setSelectedItem(null);
      setDecisionNotes('');
      await fetchVerifications();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al registrar la observación.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'PENDING_VERIFICATION') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5" /> Pendiente revisión
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" /> Observado / Rechazado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Verificado UPC
      </span>
    );
  };

  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Coordinación de Seguimiento a Egresados UPC
            </div>
            <h2 className="page-title">Verificación Académica de Egresados</h2>
            <p className="text-sm mt-1 text-ink-secondary">
              Valida solicitudes de registro abierto (Gmail, Hotmail, Outlook o institucional) contrastando cédula, programa, año de grado y número de acta o diploma.
            </p>
          </div>
          <button
            onClick={() => fetchVerifications()}
            disabled={loading}
            className="btn-outline flex items-center gap-2 self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar bandeja
          </button>
        </div>
      </div>

      {/* Tarjetas KPI interactivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => { setStatusFilter('PENDING_VERIFICATION'); setCurrentPage(1); }}
          className={`card p-5 text-left transition-all border-2 ${
            statusFilter === 'PENDING_VERIFICATION'
              ? 'border-amber-500 ring-2 ring-amber-500/15'
              : 'border-transparent hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Pendientes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-ink mt-2">{summary.pending}</p>
          <p className="text-xs text-ink-secondary mt-1">Esperando validación de acta/diploma</p>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('REJECTED'); setCurrentPage(1); }}
          className={`card p-5 text-left transition-all border-2 ${
            statusFilter === 'REJECTED'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-transparent hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Con Observación</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-ink mt-2">{summary.rejected}</p>
          <p className="text-xs text-ink-secondary mt-1">Pendientes de corrección del egresado</p>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('APPROVED'); setCurrentPage(1); }}
          className={`card p-5 text-left transition-all border-2 ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-transparent hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Aprobados</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-ink mt-2">{summary.approved}</p>
          <p className="text-xs text-ink-secondary mt-1">Con acceso total al portal</p>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`card p-5 text-left transition-all border-2 ${
            statusFilter === 'ALL'
              ? 'border-brand-500 ring-2 ring-brand-500/15'
              : 'border-transparent hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Total Egresados</span>
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-ink mt-2">{summary.total}</p>
          <p className="text-xs text-ink-secondary mt-1">Ver todo el padrón</p>
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="card p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo (gmail/hotmail...), cédula, acta o diploma..."
              className="input w-full pl-10"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={programFilter}
              onChange={(e) => { setProgramFilter(e.target.value); setCurrentPage(1); }}
              className="input w-full"
            >
              <option value="">Todos los Programas UPC</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="input w-full"
            >
              <option value="PENDING_VERIFICATION">Pendientes</option>
              <option value="REJECTED">Observados</option>
              <option value="APPROVED">Aprobados</option>
              <option value="ALL">Todos los estados</option>
            </select>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <input
              type="number"
              min={1980}
              max={2035}
              placeholder="Año grado"
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
              className="input w-full"
            />
            <button type="submit" className="btn-primary px-4 shrink-0">
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Tabla principal */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm font-medium">Consultando solicitudes de verificación...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-ink">No hay solicitudes con los filtros seleccionados</h3>
            <p className="text-sm text-ink-secondary mt-1">
              Cuando un egresado se registre con su correo personal o institucional aparecerá aquí para validación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Egresado & Correo</th>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Cédula</th>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Programa & Año</th>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Acta / Diploma</th>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider">Estado</th>
                  <th className="px-5 py-3.5 font-bold text-ink-secondary uppercase text-[11px] tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedItems.map((item) => (
                  <tr key={item.user_id} className="hover:bg-[var(--bg-muted)]/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-ink">
                        {item.first_name} {item.last_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-ink-secondary mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.email}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.email_verified
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                          title={
                            item.email_verified
                              ? 'El egresado ya confirmó su correo electrónico'
                              : 'Aún no ha hecho clic en el enlace enviado a su correo'
                          }
                        >
                          {item.email_verified ? 'Email OK' : 'Email sin confirmar'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-ink">
                      {item.document_id || <span className="text-ink-secondary italic">Sin registrar</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{item.program_name}</p>
                      <p className="text-xs text-ink-secondary">Cohorte {item.graduation_year}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="space-y-1">
                        {item.degree_act_number && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-50 text-brand-800 font-semibold mr-1">
                            <FileBadge className="w-3.5 h-3.5" /> Acta: {item.degree_act_number}
                          </div>
                        )}
                        {item.diploma_number && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold">
                            <FileText className="w-3.5 h-3.5" /> Diploma: {item.diploma_number}
                          </div>
                        )}
                        {!item.degree_act_number && !item.diploma_number && (
                          <span className="text-ink-secondary italic">Pre-cargado institucional</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {renderStatusBadge(item.verification_status)}
                      {item.verification_notes && (
                        <p className="text-[11px] text-ink-secondary mt-1 max-w-[220px] truncate" title={item.verification_notes}>
                          Nota: {item.verification_notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setDecisionNotes(item.verification_notes || '');
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-bold text-ink hover:bg-[var(--bg-muted)] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Revisar
                        </button>
                        {item.verification_status !== 'APPROVED' && (
                          <button
                            type="button"
                            disabled={processingId === item.user_id}
                            onClick={() => handleApprove(item)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {processingId === item.user_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Aprobar
                          </button>
                        )}
                        {item.verification_status !== 'REJECTED' && (
                          <button
                            type="button"
                            disabled={processingId === item.user_id}
                            onClick={() => {
                              setRejectingItem(item);
                              setDecisionNotes(item.verification_notes || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Observar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalItems={items.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal de Revisión Detallada */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} maxWidth="max-w-2xl">
        {selectedItem && (
          <div>
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Expediente de Verificación · {selectedItem.first_name} {selectedItem.last_name}
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  ID Usuario #{selectedItem.user_id} · {selectedItem.email}
                </p>
              </div>
              {renderStatusBadge(selectedItem.verification_status)}
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--bg-muted)] p-4 rounded-2xl border border-[var(--border-color)]">
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <IdCard className="w-3.5 h-3.5" /> Documento / Cédula
                  </span>
                  <p className="text-sm font-bold text-ink mt-1 font-mono">
                    {selectedItem.document_id || 'No registrado'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Programa y Cohorte
                  </span>
                  <p className="text-sm font-bold text-ink mt-1">
                    {selectedItem.program_name} ({selectedItem.graduation_year})
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <FileBadge className="w-3.5 h-3.5" /> Número de Acta de Grado
                  </span>
                  <p className="text-sm font-bold text-ink mt-1 font-mono">
                    {selectedItem.degree_act_number || 'No suministrado'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Número de Diploma / Folio
                  </span>
                  <p className="text-sm font-bold text-ink mt-1 font-mono">
                    {selectedItem.diploma_number || 'No suministrado'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Correo Personal / Contacto
                  </span>
                  <p className="text-sm font-semibold text-ink mt-1 break-all">
                    {selectedItem.email}{' '}
                    <span className="text-xs text-ink-secondary">
                      ({selectedItem.email_verified ? 'Correo confirmado' : 'Pendiente confirmar enlace'})
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-ink-secondary flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Teléfono
                  </span>
                  <p className="text-sm font-semibold text-ink mt-1">
                    {selectedItem.phone || 'No registrado'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
                  Nota u observación de Coordinación (se enviará al egresado por correo y notificación)
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Ej. Verificado contra libro de actas Folio 204 · o indica el motivo si requiere corrección..."
                  className="input w-full"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="btn-ghost"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={processingId === selectedItem.user_id}
                  onClick={() => {
                    if (!decisionNotes.trim()) {
                      toast.error('Escribe una observación en el campo de nota para indicar qué debe corregir el egresado.');
                      return;
                    }
                    setRejectingItem(selectedItem);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-bold inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Rechazar / Pedir corrección
                </button>
                <button
                  type="button"
                  disabled={processingId === selectedItem.user_id}
                  onClick={() => handleApprove(selectedItem, decisionNotes)}
                  className="btn-primary inline-flex items-center gap-1.5"
                >
                  {processingId === selectedItem.user_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Aprobar Egresado UPC
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Rechazo / Observación Rápida */}
      <Modal isOpen={!!rejectingItem} onClose={() => setRejectingItem(null)} maxWidth="max-w-lg">
        {rejectingItem && (
          <form onSubmit={handleRejectSubmit}>
            <div className="p-6 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-ink">
                Registrar observación para {rejectingItem.first_name} {rejectingItem.last_name}
              </h3>
              <p className="text-xs text-ink-secondary mt-1">
                El egresado recibirá un correo en <strong>{rejectingItem.email}</strong> y podrá corregir su cédula o número de acta/diploma desde su sesión.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-secondary mb-1">
                  Motivo de rechazo u observación <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Ej. El número de acta ingresado no coincide con los registros del programa Ingeniería de Sistemas 2023. Verifica tu diploma y vuelve a enviarlo."
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingItem.user_id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold inline-flex items-center gap-2"
                >
                  {processingId === rejectingItem.user_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Enviar observación
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

