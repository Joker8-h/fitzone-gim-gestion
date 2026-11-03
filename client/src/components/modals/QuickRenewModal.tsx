import React, { useState, useEffect, useId, useRef } from 'react';
import { useModalA11y } from './useModalA11y';
import type { Client, MembershipPlan } from '../../types/api';
import { formatCOP } from '../../utils/format';

// 2. Modal de Renovación Rápida (DP-002: Suma días al vencimiento actual)
interface QuickRenewModalProps {
  isOpen: boolean;
  client: Client | null;
  plans: MembershipPlan[];
  onClose: () => void;
  onOpenPlanModal: () => void;
  onConfirm: (payload: {
    clientId: string;
    planId: string;
    paymentMethod: string;
    pricePaid: number;
    reference?: string;
  }) => Promise<void>;
}

export const QuickRenewModal: React.FC<QuickRenewModalProps> = ({
  isOpen,
  client,
  plans,
  onClose,
  onOpenPlanModal,
  onConfirm,
}) => {
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [pricePaid, setPricePaid] = useState(100000);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plans.length > 0) {
      setPlanId(plans[0].id);
      setPricePaid(plans[0].price);
    } else {
      setPlanId('');
    }
    setReference('');
  }, [plans, isOpen]);

  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, boxRef);

  if (!isOpen || !client) return null;

  const handlePlanChange = (newId: string) => {
    setPlanId(newId);
    const found = plans.find((p) => p.id === newId);
    if (found) setPricePaid(found.price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    setSubmitting(true);
    try {
      await onConfirm({
        clientId: client.id,
        planId,
        paymentMethod,
        pricePaid: Number(pricePaid),
        reference: reference || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
          Renovar / Asignar Membresía
        </h3>
        <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>
          Miembro: <strong>{client.full_name}</strong> ({client.document_id}) • Vencimiento actual:{' '}
          <strong>{client.membership_end_date || 'Sin plan vigente'}</strong>
        </p>

        {plans.length === 0 ? (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              color: '#92400e',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              No hay planes de membresía configurados aún
            </div>
            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
              Para asignar o renovar una membresía, primero debes registrar al menos un plan en el catálogo (por ejemplo: Mensualidad, Trimestre o Pase Diario).
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-green"
                onClick={() => {
                  onOpenPlanModal();
                }}
              >
                + Crear Nuevo Plan Ahora
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Seleccionar Plan *</label>
                <button
                  type="button"
                  className="card-link"
                  style={{ fontSize: 11.5 }}
                  onClick={onOpenPlanModal}
                >
                  + Crear otro plan
                </button>
              </div>
              <select
                className="form-select"
                value={planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.duration_days} días) — {formatCOP(p.price)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Método de Pago *</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia / Nequi</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto Recibido (COP) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={pricePaid}
                  onChange={(e) => setPricePaid(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Referencia de Pago (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Comprobante Nequi #83910"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div
              style={{
                background: '#e6f4ee',
                padding: '9px 12px',
                borderRadius: 10,
                fontSize: 12,
                color: '#15803d',
                marginBottom: 14,
              }}
            >
              <strong>Regla DP-002 activa:</strong> Si la membresía actual aún no ha vencido, los días del nuevo plan se sumarán automáticamente al final de su fecha de vencimiento actual.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-green" disabled={submitting || !planId}>
                {submitting ? 'Procesando...' : 'Confirmar Pago y Renovar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
