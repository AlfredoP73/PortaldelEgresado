import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Settings, Palette, Factory, Check } from 'lucide-react';

export default function AdminSettings() {
    const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
          {'Configuración'}
        </h1>
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-ink-secondary)' }}>
          {'Personalización y ajustes del sistema.'}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}>
            Abstract Factory
          </span>
        </p>
      </div>

      <div className="space-y-6">
        
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
            {'Selecciona una familia de colores. Cada tema es una implementación concreta de'} <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[11px] font-mono">ThemeFactory</code>.
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
