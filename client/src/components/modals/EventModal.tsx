import React, { useState, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';

// 5. Modal Crear Evento
interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; dayNum: string; monthShort: string; timeRange: string }) => Promise<void>;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [dayNum, setDayNum] = useState('29');
  const [monthShort, setMonthShort] = useState('OCT');
  const [timeRange, setTimeRange] = useState('09:00 AM - 11:00 AM');

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title, dayNum, monthShort, timeRange });
    setTitle('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Publicar Próximo Evento</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título del Evento *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Torneo Interno de Fuerza"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Día (Número) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={dayNum}
                onChange={(e) => setDayNum(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mes (3 letras) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={monthShort}
                onChange={(e) => setMonthShort(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Horario *</label>
            <input
              type="text"
              className="form-input"
              required
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Publicar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
