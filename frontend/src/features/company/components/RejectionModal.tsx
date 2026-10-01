import { useState } from 'react';
import Modal from '../../../components/Modal';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const REJECTION_REASONS = [
  "No cumple con la experiencia requerida",
  "No cumple con los requisitos técnicos",
  "Expectativa salarial fuera del presupuesto",
  "No se presentó a la entrevista / prueba",
  "Prueba técnica no superada",
  "Otro"
];

export default function RejectionModal({ isOpen, onClose, onConfirm }: RejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    if (selectedReason === "Otro") {
      if (!customReason.trim()) return;
      onConfirm(customReason.trim());
    } else {
      onConfirm(selectedReason);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <h3 className="text-lg font-bold text-ink mb-4">Motivo del Rechazo</h3>
        <p className="text-sm text-ink-secondary mb-4">
          Selecciona un motivo para rechazar al candidato. Este feedback se compartirá automáticamente con el egresado para ayudarle en sus futuros procesos.
        </p>
        
        <div className="space-y-3 mb-6">
          {REJECTION_REASONS.map(reason => (
            <label key={reason} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="radio" 
                name="rejection_reason" 
                value={reason} 
                checked={selectedReason === reason} 
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-4 h-4 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-ink">{reason}</span>
            </label>
          ))}
          
          {selectedReason === "Otro" && (
            <textarea
              className="w-full input mt-2"
              placeholder="Escribe el motivo del rechazo..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
            />
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button 
            onClick={handleConfirm}
            disabled={selectedReason === "Otro" && !customReason.trim()}
            className="btn-primary bg-red-600 hover:bg-red-700 text-white border-transparent"
          >
            Confirmar Rechazo
          </button>
        </div>
      </div>
    </Modal>
  );
}
