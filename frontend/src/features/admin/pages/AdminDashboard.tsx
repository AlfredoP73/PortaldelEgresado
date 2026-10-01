import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '../components/DashboardHeader';
import { KpiGrid } from '../components/KpiGrid';
import { EmploymentByProgram } from '../components/EmploymentByProgram';
import { TopIndustries } from '../components/TopIndustries';
import { SalaryByProgram } from '../components/SalaryByProgram';
import { EmploymentStatus } from '../components/EmploymentStatus';
import api from '../../../api';

export function AdminDashboard() {
  const [programId, setProgramId] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [programs, setPrograms] = useState<{id: number; name: string}[]>([]);

  useEffect(() => {
    api.get('/programs').then(res => setPrograms(res.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* Filtros */}
      <div className="card p-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col flex-1 min-w-[200px] max-w-sm">
          <label className="text-sm font-medium text-[var(--text-secondary)] mb-1">Filtrar por Programa</label>
          <select 
            value={programId || ''} 
            onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : undefined)}
            className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="">Todos los programas</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1 max-w-xs">
          <label className="text-sm font-medium text-[var(--text-secondary)] mb-1">Filtrar por Año</label>
          <input 
            type="number"
            value={year || ''}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
            className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] text-[var(--text-main)] outline-none focus:border-[var(--accent-primary)] transition-colors"
            placeholder="Ej. 2023"
          />
        </div>
      </div>

      <KpiGrid programId={programId} year={year} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmploymentByProgram programId={programId} year={year} />
        <TopIndustries programId={programId} year={year} />
      </div>

      <SalaryByProgram programId={programId} year={year} />

      <EmploymentStatus programId={programId} year={year} />
    </div>
  );
}

export default AdminDashboard;