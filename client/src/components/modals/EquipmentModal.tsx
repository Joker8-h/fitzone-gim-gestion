import React, { useState, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';

// 7. Modal Agregar Equipo
interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; category: string; status: string }) => Promise<void>;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cardio');
  const [status, setStatus] = useState('Disponible');

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, category, status });
    setName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Agregar Equipo al Gimnasio</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Equipo / Máquina *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Prensa de Piernas 45°"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Cardio">Cardio</option>
                <option value="Máquinas">Máquinas</option>
                <option value="Peso Libre">Peso Libre</option>
                <option value="Spinning">Spinning</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado Inicial</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Disponible">Disponible</option>
                <option value="En uso">En uso</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Equipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
