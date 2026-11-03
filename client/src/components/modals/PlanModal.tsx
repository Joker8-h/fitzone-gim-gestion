import React, { useState, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';

// 3. Modal Crear Nuevo Plan
interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; durationDays: number; price: number; description?: string }) => Promise<void>;
}

export const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(100000);
  const [description, setDescription] = useState('');

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, durationDays: Number(durationDays), price: Number(price), description });
    setName('');
    setDescription('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Crear Plan de Membresía</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Plan *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Plan Mensual"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Duración (Días) *</label>
              <input
                type="number"
                className="form-input"
                required
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Precio (COP) *</label>
              <input
                type="number"
                className="form-input"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input
              type="text"
              className="form-input"
              placeholder="Acceso ilimitado a zonas y clases"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
