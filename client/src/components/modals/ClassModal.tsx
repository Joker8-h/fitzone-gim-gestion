import React, { useState, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';

// 4. Modal Crear Clase Grupal
interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    capacity: number;
    colorTheme: string;
  }) => Promise<void>;
}

export const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00 - 19:00');
  const [capacity, setCapacity] = useState(20);
  const [colorTheme, setColorTheme] = useState('emerald');

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, instructorName, scheduleTime, capacity: Number(capacity), colorTheme });
    setName('');
    setInstructorName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Programar Nueva Clase</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de la Clase *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: HIIT Nocturno"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Entrenador / Instructor *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Carlos Ruiz"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Horario *</label>
              <input
                type="text"
                className="form-input"
                required
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacidad Máxima *</label>
              <input
                type="number"
                className="form-input"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color Distintivo</label>
            <select className="form-select" value={colorTheme} onChange={(e) => setColorTheme(e.target.value)}>
              <option value="emerald">Verde FITZONE</option>
              <option value="slate">Gris Oscuro (Spinning)</option>
              <option value="rose">Rojo / Vino (Funcional)</option>
              <option value="teal">Verde Azulado (CrossFit)</option>
              <option value="amber">Ámbar / Dorado (Yoga)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Clase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
