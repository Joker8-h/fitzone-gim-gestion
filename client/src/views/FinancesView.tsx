import React, { useState } from 'react';
import type { FinancialCategory, FinancialTransaction, FinanceSummary } from '../types/api';
import { formatCOP } from '../utils/format';

// ============================================================================
// 5. VISTA PAGOS Y FINANZAS (DP-006 SIN DOBLE CONTEO)
// ============================================================================
interface FinancesViewProps {
  summary: FinanceSummary | null;
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  onCreateTransaction: (payload: {
    type: 'INGRESO' | 'EGRESO';
    categoryId: string;
    concept: string;
    amount: number;
  }) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  summary,
  transactions,
  categories,
  onCreateTransaction,
  onDeleteTransaction,
}) => {
  const [txType, setTxType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const filteredCats = categories.filter((c) => c.type === txType);
  const [categoryId, setCategoryId] = useState('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState(50000);
  const [submitting, setSubmitting] = useState(false);

  const activeCategoryId = categoryId || filteredCats[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategoryId || !concept.trim()) return;
    setSubmitting(true);
    try {
      await onCreateTransaction({
        type: txType,
        categoryId: activeCategoryId,
        concept: concept.trim(),
        amount: Number(amount),
      });
      setConcept('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Pagos y Finanzas del Gimnasio</h1>
          <p className="welcome-sub">
            Flujo de caja unificado (DP-006): registra automáticamente membresías y controla pagos a entrenadores y gastos.
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Ingresos Acumulados</div>
            <div className="kpi-value" style={{ color: '#4ade80', textShadow: '0 0 12px rgba(34, 197, 94, 0.35)' }}>
              {formatCOP(summary?.totalIncomes || 0)}
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Egresos / Gastos</div>
            <div className="kpi-value" style={{ color: '#f87171', textShadow: '0 0 12px rgba(248, 113, 113, 0.35)' }}>
              {formatCOP(summary?.totalExpenses || 0)}
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Utilidad Neta Real</div>
            <div className="kpi-value">{formatCOP(summary?.netResult || 0)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registrar Movimiento en Caja</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tipo de Movimiento *</label>
              <select
                className="form-select"
                value={txType}
                onChange={(e) => {
                  const next = e.target.value as 'INGRESO' | 'EGRESO';
                  setTxType(next);
                  setCategoryId('');
                }}
              >
                <option value="EGRESO">Egreso / Gasto (Entrenadores, Servicios, Aseo)</option>
                <option value="INGRESO">Ingreso Extra (Bebidas, Suplementos, Pase Diario)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select
                className="form-select"
                value={activeCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Concepto / Descripción *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Pago quincena entrenador Juan Pérez"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monto (COP) *</label>
              <input
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-green"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center', padding: 11 }}
            >
              {submitting ? 'Guardando...' : 'Guardar Movimiento Financiero'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Historial de Transacciones ({transactions.length})</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fit-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                      No hay movimientos financieros registrados aún.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td style={{ fontWeight: 600 }}>{t.concept}</td>
                      <td>{t.category_name || 'General'}</td>
                      <td>
                        {t.type === 'INGRESO' ? (
                          <span className="pill-green">Ingreso</span>
                        ) : (
                          <span className="pill-red">Egreso</span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: t.type === 'INGRESO' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {t.type === 'INGRESO' ? '+' : '-'} {formatCOP(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="action-icon-btn"
                          title="Eliminar transacción"
                          onClick={() => onDeleteTransaction(t.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
