import React, { useState, useEffect } from 'react';
import type { Client, MembershipPlan } from '../types/api';
import { formatCOP } from '../utils/format';

// ============================================================================
// 2. VISTA MEMBRESÍAS Y PLANES (DP-002 SUMA ACUMULATIVA DE DÍAS)
// ============================================================================
interface MembershipsViewProps {
  plans: MembershipPlan[];
  clients: Client[];
  onOpenPlanModal: () => void;
  onOpenNewClient: () => void;
  onDeletePlan: (id: string) => void;
  onAssignMembership: (payload: {
    clientId: string;
    planId: string;
    paymentMethod: string;
    pricePaid: number;
    reference?: string;
  }) => Promise<void>;
}

export const MembershipsView: React.FC<MembershipsViewProps> = ({
  plans,
  clients,
  onOpenPlanModal,
  onOpenNewClient,
  onDeletePlan,
  onAssignMembership,
}) => {
  const [clientId, setClientId] = useState('');
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [pricePaid, setPricePaid] = useState(100000);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!clientId && clients.length > 0) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  useEffect(() => {
    if (plans.length > 0) {
      const exists = plans.find((p) => p.id === planId);
      if (!exists) {
        setPlanId(plans[0].id);
        setPricePaid(plans[0].price);
      }
    } else {
      setPlanId('');
    }
  }, [plans, planId]);

  const handlePlanChange = (newPlanId: string) => {
    setPlanId(newPlanId);
    const p = plans.find((x) => x.id === newPlanId);
    if (p) setPricePaid(p.price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClientId = clientId || clients[0]?.id;
    const targetPlanId = planId || plans[0]?.id;
    if (!targetClientId || !targetPlanId) return;
    setSubmitting(true);
    try {
      await onAssignMembership({
        clientId: targetClientId,
        planId: targetPlanId,
        paymentMethod,
        pricePaid: Number(pricePaid),
        reference: reference || undefined,
      });
      setReference('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Planes y Membresías</h1>
          <p className="welcome-sub">
            Renovación inteligente (DP-002): si el miembro tiene días vigentes, el nuevo plan se suma al final de su vencimiento actual.
          </p>
        </div>
        <button type="button" className="btn-green" onClick={onOpenPlanModal}>
          + Crear Nuevo Plan
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Catálogo de Planes Activos ({plans.length})</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {plans.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', fontSize: 13, color: '#64748b', padding: '18px 0' }}>
                No hay planes de membresía creados todavía. Haz clic arriba en <strong>"+ Crear Nuevo Plan"</strong> para registrar tus planes (por ejemplo: Mensualidad, Trimestre o Pase Diario).
              </div>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: 16,
                    background: 'linear-gradient(145deg, #121a2d 0%, #0d1526 100%)',
                    position: 'relative',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>{p.name}</div>
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Eliminar plan"
                      onClick={() => onDeletePlan(p.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', margin: '4px 0', textShadow: '0 0 10px rgba(34, 197, 94, 0.3)' }}>
                    {formatCOP(p.price)}
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Duración: <strong style={{ color: '#ffffff' }}>{p.duration_days} días calendario</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                    {p.description || 'Acceso completo'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Asignar o Renovar Membresía</div>
          </div>
          {clients.length === 0 || plans.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 12 }}>
                Para asignar una membresía se requiere al menos <strong>1 miembro registrado</strong> y{' '}
                <strong>1 plan activo</strong> en el catálogo.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {clients.length === 0 && (
                  <button type="button" className="btn-green" onClick={onOpenNewClient}>
                    + Registrar Miembro
                  </button>
                )}
                {plans.length === 0 && (
                  <button type="button" className="btn-green" onClick={onOpenPlanModal}>
                    + Crear Plan de Membresía
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Seleccionar Miembro *</label>
                <select
                  className="form-select"
                  value={clientId || clients[0]?.id || ''}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.document_id}) — Vence: {c.membership_end_date || 'Sin plan'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Seleccionar Plan *</label>
                <select
                  className="form-select"
                  value={planId || plans[0]?.id || ''}
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
                    <option value="TRANSFERENCIA">Transferencia / Nequi / Daviplata</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor a Cobrar (COP) *</label>
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
                <label className="form-label">Referencia / Comprobante (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Nequi #84920"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-green"
                disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', padding: 11 }}
              >
                {submitting ? 'Activando Membresía...' : 'Confirmar Pago y Activar Membresía'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
