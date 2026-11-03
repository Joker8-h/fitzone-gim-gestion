import React, { useState, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';

// 6. Modal Crear Empleado
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    fullName: string;
    role: string;
    specialty: string;
    phone: string;
    salary: number;
  }) => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Entrenador');
  const [specialty, setSpecialty] = useState('Musculación & Cardio');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState(1750000);

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ fullName, role, specialty, phone, salary: Number(salary) });
    setFullName('');
    setPhone('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Registrar Empleado / Entrenador</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Camilo Vargas"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Cargo *</label>
              <input
                type="text"
                className="form-input"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Especialidad</label>
              <input
                type="text"
                className="form-input"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Teléfono *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="3109876543"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salario Base (COP)</label>
              <input
                type="number"
                className="form-input"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Empleado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
