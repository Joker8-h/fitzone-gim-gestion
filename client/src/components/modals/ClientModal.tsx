import React, { useState, useEffect, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';
import type { Client } from '../../types/api';

// 1. Modal Crear / Editar Miembro (DP-001)
interface ClientModalProps {
  isOpen: boolean;
  editingClient: Client | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    documentId: string;
    fullName: string;
    phone: string;
    notes?: string;
    status?: 'ACTIVO' | 'INACTIVO';
  }) => Promise<void>;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, editingClient, onClose, onSave }) => {
  const [documentId, setDocumentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setDocumentId(editingClient.document_id);
      setFullName(editingClient.full_name);
      setPhone(editingClient.phone);
      setNotes(editingClient.notes || '');
      setStatus(editingClient.status);
    } else {
      setDocumentId('');
      setFullName('');
      setPhone('');
      setNotes('');
      setStatus('ACTIVO');
    }
  }, [editingClient, isOpen]);

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        id: editingClient?.id,
        documentId,
        fullName,
        phone,
        notes,
        status,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
          {editingClient ? 'Editar Miembro' : 'Registrar Nuevo Miembro'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Documento / Cédula *</label>
            <input
              type="text"
              className="form-input"
              required
              disabled={!!editingClient}
              placeholder="Ej: 1020456789"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Carlos Martínez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono WhatsApp *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: 3104567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {editingClient && (
            <div className="form-group">
              <label className="form-label">Estado del Miembro</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVO' | 'INACTIVO')}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Observaciones (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Objetivo físico o nota médica..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
