import React, { useState } from 'react';
import type {
  Client,
  Employee,
  EquipmentItem,
  FinancialCategory,
  FinancialTransaction,
  FinanceSummary,
  DashboardMetrics,
  TrackingRule,
  TrackingCandidate,
  CommunicationLog,
  AuditLog,
} from '../types/api';
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
            <div className="kpi-value" style={{ color: '#15803d' }}>
              {formatCOP(summary?.totalIncomes || 0)}
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Total Egresos / Gastos</div>
            <div className="kpi-value" style={{ color: '#b91c1c' }}>
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

// ============================================================================
// 6. VISTA EMPLEADOS Y ENTRENADORES
// ============================================================================
interface EmployeesViewProps {
  employees: Employee[];
  onOpenNewEmployee: () => void;
  onToggleEmployee: (id: string) => void;
  onPayEmployeeSalary: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  onOpenNewEmployee,
  onToggleEmployee,
  onPayEmployeeSalary,
  onDeleteEmployee,
}) => {
  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Empleados y Entrenadores</h1>
          <p className="welcome-sub">
            Planta de entrenadores, instructores y personal administrativo con registro directo de pago de nómina.
          </p>
        </div>
        <button type="button" className="btn-green" onClick={onOpenNewEmployee}>
          + Registrar Empleado
        </button>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Nombre Completo</th>
                <th>Cargo</th>
                <th>Especialidad</th>
                <th>Teléfono</th>
                <th>Salario Mensual</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                    No hay empleados ni entrenadores registrados. Haz clic en <strong>"+ Registrar Empleado"</strong> para agregar el primero.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{emp.full_name}</td>
                    <td>{emp.role}</td>
                    <td>{emp.specialty || 'General'}</td>
                    <td>{emp.phone}</td>
                    <td style={{ fontWeight: 700 }}>{formatCOP(emp.salary)}</td>
                    <td>
                      {emp.status === 'ACTIVO' ? (
                        <span className="pill-green">Activo</span>
                      ) : (
                        <span className="pill-red">Inactivo</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn-green"
                        style={{ padding: '5px 11px', fontSize: 11.5, marginRight: 6 }}
                        onClick={() => onPayEmployeeSalary(emp)}
                        title="Registrar egreso de pago en Finanzas"
                      >
                        Pagar Nómina
                      </button>
                      <button
                        type="button"
                        className="filter-tab"
                        style={{ marginRight: 6 }}
                        onClick={() => onToggleEmployee(emp.id)}
                      >
                        {emp.status === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Eliminar empleado"
                        onClick={() => onDeleteEmployee(emp.id)}
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
    </section>
  );
};

// ============================================================================
// 7. VISTA EQUIPOS Y MAQUINARIA
// ============================================================================
interface EquipmentViewProps {
  equipment: EquipmentItem[];
  onOpenNewEquipment: () => void;
  onCycleStatus: (id: string, currentStatus: string) => void;
  onDeleteEquipment: (id: string) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipment,
  onOpenNewEquipment,
  onCycleStatus,
  onDeleteEquipment,
}) => {
  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Inventario y Estado de Equipos</h1>
          <p className="welcome-sub">
            Control operativo de máquinas de cardio, peso libre, spinning y registro de mantenimientos.
          </p>
        </div>
        <button type="button" className="btn-green" onClick={onOpenNewEquipment}>
          + Agregar Equipo
        </button>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Equipo / Máquina</th>
                <th>Categoría</th>
                <th>Estado Actual</th>
                <th>Último Mantenimiento</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                    No hay máquinas ni equipos en el inventario aún. Haz clic en <strong>"+ Agregar Equipo"</strong> para registrar el primero.
                  </td>
                </tr>
              ) : (
                equipment.map((eq) => {
                  const pill =
                    eq.status === 'Disponible' ? (
                      <span className="pill-green">Disponible</span>
                    ) : eq.status === 'En uso' ? (
                      <span className="pill-green">En uso</span>
                    ) : (
                      <span className="pill-amber">Mantenimiento</span>
                    );

                  return (
                    <tr key={eq.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{eq.name}</td>
                      <td>{eq.category}</td>
                      <td>{pill}</td>
                      <td>Mant. {eq.last_maintenance}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="filter-tab"
                          style={{ marginRight: 6 }}
                          onClick={() => onCycleStatus(eq.id, eq.status)}
                        >
                          Cambiar Estado
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn"
                          title="Eliminar equipo"
                          onClick={() => onDeleteEquipment(eq.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 8. VISTA REPORTES EJECUTIVOS Y AUDITORÍA DE SEGURIDAD
// ============================================================================
interface ReportsViewProps {
  metrics: DashboardMetrics | null;
  clients: Client[];
  auditLogs: AuditLog[];
  onOpenQuickRenew: (client: Client) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  metrics,
  clients,
  auditLogs,
  onOpenQuickRenew,
}) => {
  const priorityClients = clients.filter((c) => c.membership_status !== 'VIGENTE');

  const handleExportCsv = () => {
    const headers = ['Documento', 'Nombre Completo', 'Telefono', 'Plan', 'Vencimiento', 'Estado'];
    const rows = clients.map((c) => [
      c.document_id,
      `"${c.full_name}"`,
      c.phone,
      `"${c.plan_name || 'Sin plan'}"`,
      c.membership_end_date || '',
      c.membership_status || c.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_miembros_fitzone_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Reportes Ejecutivos y Auditoría</h1>
          <p className="welcome-sub">
            Estado de cartera, vencimientos prioritarios y bitácora inmutable de seguridad.
          </p>
        </div>
        <button type="button" className="btn-green" onClick={handleExportCsv}>
          Exportar Base de Miembros (CSV)
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Membresías Vigentes</div>
            <div className="kpi-value" style={{ color: '#15803d' }}>
              {metrics?.memberships?.vigente || 0}
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Por Vencer (3 días o menos)</div>
            <div className="kpi-value" style={{ color: '#d97706' }}>
              {metrics?.memberships?.porVencer || 0}
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Membresías Vencidas</div>
            <div className="kpi-value" style={{ color: '#b91c1c' }}>
              {metrics?.memberships?.vencida || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">
            Miembros con Membresía Por Vencer o Vencida (Prioridad de Renovación)
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Fecha Vencimiento</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {priorityClients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px 12px', color: '#64748b' }}>
                    No hay miembros con membresías vencidas o próximas a vencer.
                  </td>
                </tr>
              ) : (
                priorityClients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                    <td>{c.phone}</td>
                    <td>{c.plan_name || 'Sin plan'}</td>
                    <td>{c.membership_end_date || '—'}</td>
                    <td>
                      {c.membership_status === 'POR_VENCER' ? (
                        <span className="pill-amber">Por Vencer</span>
                      ) : (
                        <span className="pill-red">Vencida / Sin plan</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-green"
                        style={{ padding: '5px 12px', fontSize: 11.5 }}
                        onClick={() => onOpenQuickRenew(c)}
                      >
                        Renovar Ahora
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Bitácora de Auditoría y Seguridad ({auditLogs.length})</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalle Auditado</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px 12px', color: '#64748b' }}>
                    No se han registrado eventos en la bitácora todavía.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.created_at}</td>
                    <td>
                      <span className="pill-green">{log.action}</span>
                    </td>
                    <td>{log.entity}</td>
                    <td>{log.details}</td>
                    <td style={{ fontWeight: 600 }}>{log.performed_by || 'Sistema'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 9. VISTA CONFIGURACIÓN & WHATSAPP IA (BAILEYS QR + GEMINI AI)
// ============================================================================
interface WhatsAppAiViewProps {
  waStatus: {
    status: string;
    qrDataUrl: string | null;
    qrCodeDataUrl?: string | null;
    connectedPhone: string | null;
    userPhone?: string | null;
  };
  rules: TrackingRule[];
  candidates: TrackingCandidate[];
  logs: CommunicationLog[];
  onRefreshWa: () => Promise<void>;
  onConnectWa: () => Promise<void>;
  onDisconnectWa: () => Promise<void>;
  onRunAutomatedSweep: () => Promise<void>;
  onSendSingleCandidate: (cand: TrackingCandidate) => Promise<void>;
  onUpdateRule: (
    ruleType: string,
    data: { thresholdDays: number; isEnabled: boolean; messageTemplate: string }
  ) => Promise<void>;
}

export const WhatsAppAiView: React.FC<WhatsAppAiViewProps> = ({
  waStatus,
  rules,
  candidates,
  logs,
  onRefreshWa,
  onConnectWa,
  onDisconnectWa,
  onRunAutomatedSweep,
  onSendSingleCandidate,
  onUpdateRule,
}) => {
  const [runningSweep, setRunningSweep] = useState(false);
  const [editingRules, setEditingRules] = useState<Record<string, { days: number; tpl: string }>>({});

  const handleRunSweep = async () => {
    setRunningSweep(true);
    try {
      await onRunAutomatedSweep();
    } finally {
      setRunningSweep(false);
    }
  };

  const qrImg = waStatus.qrDataUrl || waStatus.qrCodeDataUrl || null;
  const phoneDisplay = waStatus.connectedPhone || waStatus.userPhone || 'Activo';

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Configuración y Automatización WhatsApp IA</h1>
          <p className="welcome-sub">
            Vinculación directa por código QR (Baileys) y seguimiento inteligente con Gemini AI (DP-011).
          </p>
        </div>
        <button
          type="button"
          className="btn-green"
          disabled={runningSweep}
          onClick={handleRunSweep}
        >
          {runningSweep ? 'Procesando con IA...' : 'Ejecutar Barrido Automático IA Ahora'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 18, marginBottom: 18 }}>
        {/* Panel QR Baileys */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header">
            <div className="card-title">Vinculación WhatsApp del Gimnasio</div>
            <span className={waStatus.status === 'CONNECTED' ? 'pill-green' : 'pill-amber'}>
              {waStatus.status === 'CONNECTED'
                ? `Conectado (${phoneDisplay})`
                : waStatus.status === 'SCAN_QR'
                ? 'Esperando escaneo QR'
                : 'Desconectado'}
            </span>
          </div>

          <div
            style={{
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              borderRadius: 14,
              padding: 16,
              marginBottom: 14,
            }}
          >
            {waStatus.status === 'CONNECTED' ? (
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
                  Sesión de WhatsApp Vinculada
                </div>
                <p style={{ fontSize: 12.5, color: '#475569' }}>
                  El motor de IA enviará los recordatorios directamente desde el WhatsApp del gimnasio.
                </p>
              </div>
            ) : qrImg ? (
              <div>
                <img
                  src={qrImg}
                  alt="Código QR WhatsApp Baileys"
                  style={{
                    width: 195,
                    height: 195,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    marginBottom: 8,
                  }}
                />
                <p style={{ fontSize: 12, color: '#475569' }}>
                  Abre WhatsApp en tu celular → Dispositivos vinculados → Escanea este código QR
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                  Haz clic en "Generar / Reconectar QR" para vincular el WhatsApp del gimnasio.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-green" onClick={onConnectWa}>
              Generar / Reconectar QR
            </button>
            <button type="button" className="btn-secondary" onClick={onRefreshWa}>
              Actualizar Estado
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ color: '#b91c1c' }}
              onClick={onDisconnectWa}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Candidatos detectados hoy con su mensaje redactado por IA */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Candidatos Detectados Hoy por el Motor IA ({candidates.length})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: 12 }}>
                No hay miembros pendientes de recordatorio en este momento.
              </div>
            ) : (
              candidates.map((cand) => (
                <div
                  key={`${cand.clientId}-${cand.reason}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: cand.reason === 'INACTIVITY' ? '#fff1f2' : '#fffbeb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{cand.fullName}</strong> ({cand.phone})
                    </div>
                    <span className={cand.reason === 'INACTIVITY' ? 'pill-red' : 'pill-amber'}>
                      {cand.reason === 'INACTIVITY'
                        ? `Inactivo ${cand.daysInfo} días`
                        : `Vence en ${cand.daysInfo} días`}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#334155',
                      background: '#ffffff',
                      padding: '8px 10px',
                      borderRadius: 8,
                      marginBottom: 8,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    {cand.suggestedMessage}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-green"
                      style={{ padding: '5px 12px', fontSize: 11.5 }}
                      onClick={() => onSendSingleCandidate(cand)}
                    >
                      Enviar Recordatorio IA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Configuración de Reglas IA */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">Reglas de Seguimiento Inteligente (Umbrales y Plantillas)</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {rules.map((r) => {
            const currentDays = editingRules[r.rule_type]?.days ?? r.threshold_days;
            const currentTpl = editingRules[r.rule_type]?.tpl ?? r.message_template;

            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14,
                  background: '#f8fafc',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>
                  {r.rule_type === 'INACTIVITY'
                    ? 'Regla de Inactividad (Días sin asistir)'
                    : 'Regla de Vencimiento Próximo (Días antes)'}
                </div>
                <div className="form-group">
                  <label className="form-label">Umbral en Días</label>
                  <input
                    type="number"
                    className="form-input"
                    value={currentDays}
                    onChange={(e) =>
                      setEditingRules((prev) => ({
                        ...prev,
                        [r.rule_type]: { days: Number(e.target.value), tpl: currentTpl },
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Plantilla Base / Contexto IA</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={currentTpl}
                    onChange={(e) =>
                      setEditingRules((prev) => ({
                        ...prev,
                        [r.rule_type]: { days: currentDays, tpl: e.target.value },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn-green"
                  onClick={() =>
                    onUpdateRule(r.rule_type, {
                      thresholdDays: currentDays,
                      isEnabled: true,
                      messageTemplate: currentTpl,
                    })
                  }
                >
                  Guardar Regla
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bitácora de mensajes enviados */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Bitácora de Mensajes Procesados por la IA ({logs.length})</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Miembro</th>
                <th>Regla</th>
                <th>Mensaje Enviado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px 12px', color: '#64748b' }}>
                    No se han enviado comunicaciones automáticas todavía.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.sent_at}</td>
                    <td style={{ fontWeight: 700 }}>{l.full_name || 'Miembro'}</td>
                    <td>{l.rule_type}</td>
                    <td style={{ maxWidth: 440, fontSize: 12, color: '#334155' }}>{l.message}</td>
                    <td>
                      <span className="pill-green">{l.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
