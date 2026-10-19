import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  Settings, Palette, Factory, Database, Download, Loader2,
  HardDrive, Table2, GitFork, Rows3, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authApi } from '../../../api';
import ServiceStatusPanel from '../components/ServiceStatusPanel';

interface TableSummary {
  name: string;
  columns: number;
  foreign_keys: number;
  rows: number;
}

interface DatabaseSummary {
  database: string;
  size_bytes: number;
  size_pretty: string;
  tables_count: number;
  relations_count: number;
  rows_count: number;
  tables: TableSummary[];
  error?: string;
}

interface DatabasesOverview {
  checked_at: string;
  total_databases: number;
  total_tables: number;
  total_relations: number;
  total_rows: number;
  total_size_pretty: string;
  databases: DatabaseSummary[];
}

export default function AdminSettings() {
  const { theme, setTheme } = useTheme();

  // Estados para el módulo de Dump de PostgreSQL
  const [dbInfo, setDbInfo] = useState<DatabasesOverview | null>(null);
  const [loadingDbInfo, setLoadingDbInfo] = useState(true);
  const [dumpScope, setDumpScope] = useState<string>('all');
  const [includeData, setIncludeData] = useState<boolean>(true);
  const [includeDrop, setIncludeDrop] = useState<boolean>(true);
  const [generatingDump, setGeneratingDump] = useState<boolean>(false);
  const [expandedDetails, setExpandedDetails] = useState<boolean>(false);
  const [lastDumpMeta, setLastDumpMeta] = useState<{
    filename: string;
    databases: string;
    tables: string;
    relations: string;
    rows: string;
    timestamp: string;
  } | null>(null);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const fetchDatabaseInfo = useCallback(async () => {
    try {
      setLoadingDbInfo(true);
      const res = await authApi.get<DatabasesOverview>('/system/database-info');
      setDbInfo(res.data);
    } catch (err: any) {
      console.error('Error al consultar información de la BD:', err);
    } finally {
      setLoadingDbInfo(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseInfo();
  }, [fetchDatabaseInfo]);

  const handleGenerateDump = async () => {
    try {
      setGeneratingDump(true);
      const res = await authApi.get('/system/database-dump', {
        params: {
          scope: dumpScope,
          include_drop: includeDrop,
          include_data: includeData,
        },
        responseType: 'blob',
      });

      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const headerFilename = res.headers['x-dump-filename'];
      const filename = headerFilename || `portal_egresados_postgres_dump_${dumpScope}_${ts}.sql`;

      const blob = new Blob([res.data], { type: 'application/sql; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const meta = {
        filename,
        databases: res.headers['x-dump-databases'] || (dumpScope === 'all' ? String(dbInfo?.total_databases ?? 4) : '1'),
        tables: res.headers['x-dump-tables'] || String(dbInfo?.total_tables ?? '—'),
        relations: res.headers['x-dump-relations'] || String(dbInfo?.total_relations ?? '—'),
        rows: res.headers['x-dump-rows'] || String(dbInfo?.total_rows ?? '—'),
        timestamp: new Date().toLocaleTimeString('es-CO'),
      };
      setLastDumpMeta(meta);
      toast.success(`Dump PostgreSQL descargado (${filename})`);
    } catch (err: any) {
      console.error('Error generando dump:', err);
      toast.error('No se pudo generar el volcado de la base de datos.');
    } finally {
      setGeneratingDump(false);
    }
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
          {'Configuración'}
        </h1>
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-ink-secondary)' }}>
          {'Personalización, respaldo de base de datos y ajustes del sistema.'}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
            Abstract Factory
          </span>
        </p>
      </div>

      <div className="space-y-6">

        {/* Estado de microservicios */}
        <ServiceStatusPanel />

        {/* ── Respaldo y Volcado Completo de Base de Datos (PostgreSQL Dump) ── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          {/* Header */}
          <div className="p-6 flex flex-wrap items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <Database className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                Respaldo y Volcado de Base de Datos (PostgreSQL Dump)
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}>
                Exporta la estructura completa (DDL), tablas, llaves foráneas, secuencias y todos los registros en formato estándar <code className="font-mono">.sql</code>.
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}>
              Admin Only
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={fetchDatabaseInfo}
                disabled={loadingDbInfo}
                className="btn-outline flex items-center gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDbInfo ? 'animate-spin' : ''}`} />
                Sincronizar métricas
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Resumen de métricas de la BD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>
                  <HardDrive className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  Bases de Datos
                </div>
                <p className="text-2xl font-extrabold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                  {loadingDbInfo ? '…' : (dbInfo?.total_databases ?? 4)}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}>
                  Tamaño total: {loadingDbInfo ? '…' : (dbInfo?.total_size_pretty ?? '—')}
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>
                  <Table2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  Tablas (DDL)
                </div>
                <p className="text-2xl font-extrabold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                  {loadingDbInfo ? '…' : (dbInfo?.total_tables ?? '—')}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}>
                  Esquema público activo
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>
                  <GitFork className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  Relaciones (FK)
                </div>
                <p className="text-2xl font-extrabold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                  {loadingDbInfo ? '…' : (dbInfo?.total_relations ?? '—')}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}>
                  Integridad referencial
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>
                  <Rows3 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  Registros Totales
                </div>
                <p className="text-2xl font-extrabold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                  {loadingDbInfo ? '…' : (dbInfo?.total_rows != null ? dbInfo.total_rows.toLocaleString('es-CO') : '—')}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-ink-secondary)' }}>
                  Filas acumuladas en BD
                </p>
              </div>
            </div>

            {/* Controles de Configuración del Dump */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end p-5 rounded-xl border" style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-ink-secondary)' }}>
                  Alcance del Volcado (Base de Datos)
                </label>
                <select
                  value={dumpScope}
                  onChange={(e) => setDumpScope(e.target.value)}
                  className="w-full p-3 rounded-xl border outline-none text-sm font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  <option value="all">📦 Todas las Bases de Datos (Dump Completo Multi-DB)</option>
                  {(dbInfo?.databases ?? [
                    { database: 'auth_db', rows_count: 0, tables_count: 0 },
                    { database: 'graduates_db', rows_count: 0, tables_count: 0 },
                    { database: 'companies_db', rows_count: 0, tables_count: 0 },
                    { database: 'matchmaking_db', rows_count: 0, tables_count: 0 },
                  ]).map((d) => (
                    <option key={d.database} value={d.database}>
                      🗄️ {d.database} ({d.tables_count} tablas · {d.rows_count} registros)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeData}
                    onChange={(e) => setIncludeData(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                    Incluir todos los registros (<code className="font-mono">INSERT INTO</code> + secuencias)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDrop}
                    onChange={(e) => setIncludeDrop(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                    Incluir limpieza previa (<code className="font-mono">DROP TABLE IF EXISTS CASCADE</code>)
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateDump}
                  disabled={generatingDump}
                  className="w-full lg:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 shadow-lg transition-all hover:opacity-95 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #087443 0%, #10b981 100%)',
                  }}
                >
                  {generatingDump ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando Dump PostgreSQL...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generar y Descargar Dump (.sql)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmación del último dump generado */}
            {lastDumpMeta && (
              <div
                className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Volcado PostgreSQL generado exitosamente a las {lastDumpMeta.timestamp}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-ink-secondary)' }}>
                      Archivo: <code className="font-mono font-bold">{lastDumpMeta.filename}</code> · {lastDumpMeta.databases} BD(s) · {lastDumpMeta.tables} tablas · {lastDumpMeta.relations} relaciones · {Number(lastDumpMeta.rows).toLocaleString('es-CO')} registros exportados.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Registrado en Auditoría
                </span>
              </div>
            )}

            {/* Desglose detallado de tablas por Base de Datos */}
            {dbInfo && dbInfo.databases.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedDetails(!expandedDetails)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {expandedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expandedDetails ? 'Ocultar desglose de tablas y relaciones' : 'Ver desglose de tablas, relaciones y registros por Base de Datos'}
                </button>

                {expandedDetails && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbInfo.databases.map((db) => (
                      <div
                        key={db.database}
                        className="rounded-xl p-4 border"
                        style={{ backgroundColor: 'var(--bg-muted)', borderColor: 'var(--border-color)' }}
                      >
                        <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                            <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                              {db.database}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono" style={{ color: 'var(--text-ink-secondary)' }}>
                            {db.size_pretty} · {db.tables_count} tablas · {db.rows_count} filas
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {db.tables.map((t) => (
                            <div
                              key={t.name}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg"
                              style={{ backgroundColor: 'var(--bg-surface)' }}
                            >
                              <span className="font-mono font-semibold" style={{ color: 'var(--text-main)' }}>
                                {t.name}
                              </span>
                              <span className="text-[11px] font-mono" style={{ color: 'var(--text-ink-secondary)' }}>
                                {t.columns} cols · {t.foreign_keys} FKs · <strong>{t.rows}</strong> reg.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Abstract Factory Theme Section */}
        <div 
          className="rounded-2xl p-6 border"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              {'Tema Visual'} - Abstract Factory
            </h2>
          </div>
          
          <p className="text-sm mb-6" style={{ color: 'var(--text-ink-secondary)' }}>
            {'Selecciona una familia de colores. Cada tema es una implementación concreta de'} <code className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ backgroundColor: 'var(--bg-muted)' }}>ThemeFactory</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Dark Theme Card */}
            <button
              onClick={() => handleThemeChange('dark')}
              className="relative p-5 rounded-xl border-2 text-left transition-all duration-200 group overflow-hidden"
              style={{
                backgroundColor: '#051510',
                borderColor: theme === 'dark' ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              {theme === 'dark' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
              )}
              <div className="h-16 mb-4 rounded-lg bg-[#0a2018] border border-white/5 flex flex-col p-3 gap-2">
                 <div className="w-2/3 h-2 rounded-full bg-[#10b981]" />
                 <div className="flex gap-2">
                   <div className="w-1/4 h-2 rounded-full bg-[#f59e0b]" />
                   <div className="w-1/3 h-2 rounded-full bg-white/20" />
                 </div>
              </div>
              <h3 className="font-bold text-white text-sm mb-1">{'Oscuro'}</h3>
              <p className="text-[11px] text-white/40 mb-3 font-mono">DarkThemeFactory()</p>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#051510] border border-white/20" />
                <div className="w-3 h-3 rounded-full bg-[#0a2018]" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
              </div>
            </button>

            {/* Light Theme Card */}
            <button
              onClick={() => handleThemeChange('light')}
              className="relative p-5 rounded-xl border-2 text-left transition-all duration-200 group overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                borderColor: theme === 'light' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
                boxShadow: theme === 'light' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
            >
              {theme === 'light' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
              )}
              <div className="h-16 mb-4 rounded-lg bg-[#f8fafc] border border-black/5 flex flex-col p-3 gap-2">
                 <div className="w-2/3 h-2 rounded-full bg-[#10b981]" />
                 <div className="flex gap-2">
                   <div className="w-1/4 h-2 rounded-full bg-[#f59e0b]" />
                   <div className="w-1/3 h-2 rounded-full bg-[#475569]" />
                 </div>
              </div>
              <h3 className="font-bold text-[#0f172a] text-sm mb-1">{'Claro'}</h3>
              <p className="text-[11px] text-[#64748b] mb-3 font-mono">LightThemeFactory()</p>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ffffff] border border-black/20" />
                <div className="w-3 h-3 rounded-full bg-[#f8fafc]" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
              </div>
            </button>

          </div>
        </div>

        {/* Generated Variables Display */}
        <div 
          className="rounded-2xl p-6 border"
          style={{ 
            backgroundColor: 'var(--bg-muted)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-ink-secondary)' }}>
            <Factory className="w-4 h-4" /> {'Variables generadas por la fábrica'}
          </h4>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {'Fábrica instanciada'}: <code className="text-[13px] font-mono px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)' }}>ThemeFactory{theme.charAt(0).toUpperCase() + theme.slice(1)}()</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: 'BG', var: 'bg-main' },
              { name: 'SURFACE', var: 'bg-surface' },
              { name: 'CARD', var: 'bg-card' },
              { name: 'BORDER', var: 'border-color' },
              { name: 'ACCENT', var: 'accent-primary' },
              { name: 'TEXT', var: 'text-ink' },
              { name: 'MUTED', var: 'text-ink-secondary' },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div className="w-6 h-6 rounded-md shadow-sm border" style={{ backgroundColor: `var(--${item.var})`, borderColor: 'rgba(0,0,0,0.1)' }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-ink-secondary)' }}>{item.name}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-ink-tertiary)' }}>var(--{item.var})</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General System Settings */}
        <div 
          className="rounded-2xl p-6 border"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              {'Configuración general del sistema'}
            </h2>
            <span className="ml-auto text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-ink-secondary)' }}>
              Admin Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-ink-secondary)' }}>
                Zona Horaria
              </label>
              <select 
                className="w-full p-3.5 rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)'
                }}
              >
                <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                <option value="America/New_York">América/New York (UTC-4)</option>
                <option value="Europe/Madrid">Europa/Madrid (UTC+1)</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
