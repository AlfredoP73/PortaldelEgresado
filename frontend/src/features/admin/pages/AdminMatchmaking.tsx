import { useState, useEffect } from 'react';
import { matchmakingApi } from '../../../api';
import toast from 'react-hot-toast';
import { Settings, Save, AlertCircle, BookOpen, Wrench, Briefcase, Sliders } from 'lucide-react';

interface MatchmakingWeights {
  program_weight: number;
  skills_weight: number;
  experience_weight: number;
}

export default function AdminMatchmaking() {
  const [weights, setWeights] = useState<MatchmakingWeights>({
    program_weight: 0.4,
    skills_weight: 0.4,
    experience_weight: 0.2
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    try {
      setLoading(true);
      const res = await matchmakingApi.get('/criteria');
      if (res.data) {
        setWeights({
          program_weight: Number(res.data.program_weight) || 0,
          skills_weight: Number(res.data.skills_weight) || 0,
          experience_weight: Number(res.data.experience_weight) || 0
        });
      }
    } catch (error) {
      console.error('Error fetching weights:', error);
      toast.error('matchmaking.error_fetch');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = weights.program_weight + weights.skills_weight + weights.experience_weight;

    if (Math.abs(total - 1.0) > 0.01) {
      toast.error(`La suma total debe ser 100%. Actual: ${(total * 100).toFixed(0)}%`);
      return;
    }

    try {
      setSaving(true);
      await matchmakingApi.put('/criteria', weights);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving weights:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const totalSum = (weights.program_weight + weights.skills_weight + weights.experience_weight);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div>
          <h2 className="page-title text-[var(--text-main)] flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {'Configuración del Algoritmo'}
          </h2>
          <p className="text-sm mt-1 text-[var(--text-ink-secondary)]">
            {'Ajusta el peso de cada criterio para calcular el porcentaje de afinidad. La suma total debe ser exactamente 100%.'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-6 py-2.5"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 flex items-start sm:items-center gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-dark-800 dark:text-dark-300">
          {'El motor suma el puntaje de los 3 criterios multiplicados por su peso. Además, asigna un bonus adicional automático a egresados sin empleo.'}
        </p>
      </div>

      <div className="card p-0 overflow-hidden divide-y divide-[var(--border-color)]">

        <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-[var(--bg-muted)] transition-colors">
          <div className="flex items-center gap-3 md:w-1/3 shrink-0">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-main)]">{'Programa Académico'}</p>
              <p className="text-[11px] text-[var(--text-ink-secondary)] mt-0.5">{'Evalúa si el egresado pertenece a la carrera solicitada.'}</p>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center gap-4">
            <input
              type="range" min="0" max="1" step="0.05"
              className="w-full accent-indigo-600"
              value={weights.program_weight}
              onChange={(e) => setWeights({ ...weights, program_weight: parseFloat(e.target.value) || 0 })}
            />
            <span className="font-black text-indigo-600 dark:text-indigo-400 w-12 text-right">{(weights.program_weight * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-[var(--bg-muted)] transition-colors">
          <div className="flex items-center gap-3 md:w-1/3 shrink-0">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-main)]">{'Habilidades Técnicas'}</p>
              <p className="text-[11px] text-[var(--text-ink-secondary)] mt-0.5">{'Cruce entre las competencias y requerimientos.'}</p>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center gap-4">
            <input
              type="range" min="0" max="1" step="0.05"
              className="w-full accent-emerald-600"
              value={weights.skills_weight}
              onChange={(e) => setWeights({ ...weights, skills_weight: parseFloat(e.target.value) || 0 })}
            />
            <span className="font-black text-emerald-600 dark:text-emerald-400 w-12 text-right">{(weights.skills_weight * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-[var(--bg-muted)] transition-colors">
          <div className="flex items-center gap-3 md:w-1/3 shrink-0">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-main)]">{'Experiencia Laboral'}</p>
              <p className="text-[11px] text-[var(--text-ink-secondary)] mt-0.5">{'Proporción de años trabajados según lo exigido.'}</p>
            </div>
          </div>
          <div className="flex-1 w-full flex items-center gap-4">
            <input
              type="range" min="0" max="1" step="0.05"
              className="w-full accent-amber-600"
              value={weights.experience_weight}
              onChange={(e) => setWeights({ ...weights, experience_weight: parseFloat(e.target.value) || 0 })}
            />
            <span className="font-black text-amber-600 dark:text-amber-400 w-12 text-right">{(weights.experience_weight * 100).toFixed(0)}%</span>
          </div>
        </div>

      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{'Suma Total'}</span>
          <span className={`text-2xl font-black ${Math.abs(totalSum - 1.0) < 0.01
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-500 dark:text-red-400'
            }`}>
            {(totalSum * 100).toFixed(0)}%
          </span>
        </div>
        {Math.abs(totalSum - 1.0) > 0.01 && (
          <span className="text-sm font-medium text-red-500 dark:text-red-400">
            Ajusta los deslizadores para que la suma sea exactamente 100%.
          </span>
        )}
      </div>

    </div>
  );
}
