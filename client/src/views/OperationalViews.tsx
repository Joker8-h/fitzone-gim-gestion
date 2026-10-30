import React, { useState, useEffect } from 'react';
import type {
  Client,
  MembershipPlan,
  GymClass,
  GymEvent,
  AttendanceRecord,
} from '../types/api';
import { formatCOP, formatTime12h, getFallbackAvatar } from '../utils/format';

// ============================================================================
// 1. VISTA MIEMBROS (DIRECTORIO COMPLETO Y ACCIONES CRUD)
// ============================================================================
interface ClientsViewProps {
  clients: Client[];
  onOpenNew: () => void;
  onOpenEdit: (client: Client) => void;
  onOpenRenew: (client: Client) => void;
  onQuickCheckIn: (client: Client) => void;
  onToggleStatus: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onOpenNew,
  onOpenEdit,
  onOpenRenew,
  onQuickCheckIn,
  onToggleStatus,
  onDeleteClient,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = clients.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.document_id.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Gestión de Miembros</h1>
          <p className="welcome-sub">
            Directorio completo de afiliados, estado de vigencia, renovación y control de acceso.
          </p>
        </div>
        <button type="button" className="btn-green" onClick={onOpenNew}>
          + Registrar Nuevo Miembro
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="search"
            className="form-input"
            style={{ maxWidth: 360 }}
            placeholder="Buscar por cédula, nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ maxWidth: 210 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados ({clients.length})</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Plan Actual</th>
                <th>Vencimiento</th>
                <th>Vigencia</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                    No se encontraron miembros registrados. Haz clic en <strong>"+ Registrar Nuevo Miembro"</strong> para agregar el primero.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const fallback = getFallbackAvatar(c.full_name);
                  let badge = <span className="pill-green">Vigente</span>;
                  if (c.membership_status === 'POR_VENCER') {
                    badge = <span className="pill-amber">Por vencer</span>;
                  } else if (
                    c.membership_status === 'VENCIDA' ||
                    c.membership_status === 'SIN_MEMBRESIA'
                  ) {
                    badge = <span className="pill-red">Vencida / Sin plan</span>;
                  }

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={c.avatar_url || fallback}
                            alt={c.full_name}
                            className="member-avatar-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = fallback;
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.full_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Estado: {c.status}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.document_id}</td>
                      <td>{c.phone}</td>
                      <td>{c.plan_name || 'Sin plan'}</td>
                      <td>{c.membership_end_date || '—'}</td>
                      <td>{badge}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn-green"
                          style={{ padding: '5px 11px', fontSize: 11.5, marginRight: 6 }}
                          onClick={() => onQuickCheckIn(c)}
                        >
                          Registrar Entrada
                        </button>
                        <button
                          type="button"
                          className="filter-tab"
                          style={{ marginRight: 6 }}
                          onClick={() => onOpenRenew(c)}
                        >
                          Renovar
                        </button>
                        <button
                          type="button"
                          className="filter-tab"
                          style={{ marginRight: 6 }}
                          onClick={() => onOpenEdit(c)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="filter-tab"
                          style={{ marginRight: 6 }}
                          onClick={() => onToggleStatus(c)}
                        >
                          {c.status === 'ACTIVO' ? 'Inactivar' : 'Reactivar'}
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn"
                          title="Eliminar miembro"
                          onClick={() => onDeleteClient(c)}
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
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 15,
                    background: '#f8fafc',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Eliminar plan"
                      onClick={() => onDeletePlan(p.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1f8e5f', margin: '4px 0' }}>
                    {formatCOP(p.price)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Duración: <strong>{p.duration_days} días calendario</strong>
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

// ============================================================================
// 3. VISTA CLASES Y EVENTOS DEL GIMNASIO
// ============================================================================
interface ClassesViewProps {
  classes: GymClass[];
  events: GymEvent[];
  onOpenClassModal: () => void;
  onOpenEventModal: () => void;
  onAdjustClassQuota: (id: string, delta: number) => void;
  onDeleteClass: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  events,
  onOpenClassModal,
  onOpenEventModal,
  onAdjustClassQuota,
  onDeleteClass,
  onDeleteEvent,
}) => {
  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Clases Grupales y Eventos</h1>
          <p className="welcome-sub">
            Control de horarios, instructores, cupos de clases en vivo y calendario de eventos FITZONE.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn-green" onClick={onOpenClassModal}>
            + Nueva Clase
          </button>
          <button
            type="button"
            className="btn-green"
            style={{ backgroundColor: '#334155' }}
            onClick={onOpenEventModal}
          >
            + Nuevo Evento
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Horario de Clases de Hoy ({classes.length})</div>
          </div>
          <div className="class-list">
            {classes.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '16px 0' }}>
                No hay clases grupales programadas. Haz clic en <strong>"+ Nueva Clase"</strong> para agregar una al horario.
              </div>
            ) : (
              classes.map((c) => {
                const pct = Math.min(100, Math.round((c.enrolled_count / (c.capacity || 20)) * 100));
                return (
                  <div key={c.id} className="class-item">
                    <div className="class-item-left">
                      <div className={`class-badge-icon ${c.color_theme || 'emerald'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6.5 6.5l11 11" />
                          <path d="M21 21l-1-1" />
                          <path d="M3 3l1 1" />
                          <path d="M18 22l4-4" />
                          <path d="M2 6l4-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="class-time">{c.schedule_time}</div>
                        <div className="class-name">{c.name}</div>
                        <div className="class-coach">Instructor: {c.instructor_name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="class-progress-wrap">
                        <div className="class-quota">
                          {c.enrolled_count} / {c.capacity} inscritos
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Inscribir alumno (+1)"
                        onClick={() => onAdjustClassQuota(c.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Retirar alumno (-1)"
                        onClick={() => onAdjustClassQuota(c.id, -1)}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Eliminar clase"
                        onClick={() => onDeleteClass(c.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Calendario de Próximos Eventos ({events.length})</div>
          </div>
          <div className="event-list">
            {events.length === 0 ? (
              <div style={{ fontSize: 13, color: '#64748b', padding: '16px 0' }}>
                No hay próximos eventos publicados. Haz clic en <strong>"+ Nuevo Evento"</strong> para publicar uno.
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="event-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="event-date-box">
                      <span className="event-day">{ev.day_num}</span>
                      <span className="event-month">{ev.month_short}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{ev.time_range}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Eliminar evento"
                    onClick={() => onDeleteEvent(ev.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 4. VISTA ASISTENCIA Y KIOSCO DE RECEPCIÓN (DP-003)
// ============================================================================
interface AttendanceViewProps {
  clients: Client[];
  attendances: AttendanceRecord[];
  onCheckInAttempt: (
    client: Client,
    override?: boolean,
    overrideReason?: string
  ) => Promise<{ ok: boolean; status?: number; message: string }>;
  onOpenQuickRenew: (client: Client) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  clients,
  attendances,
  onCheckInAttempt,
  onOpenQuickRenew,
}) => {
  const [docInput, setDocInput] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'blocked' | 'notfound';
    message: string;
    client?: Client;
  } | null>(null);

  const handleKioskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = docInput.trim().toLowerCase();
    if (!q) return;

    const match =
      clients.find((c) => c.document_id.toLowerCase() === q) ||
      clients.find((c) => c.full_name.toLowerCase().includes(q));

    if (!match) {
      setFeedback({
        type: 'notfound',
        message: `No se encontró ningún miembro con el documento o nombre "${docInput}".`,
      });
      return;
    }

    const res = await onCheckInAttempt(match, false);
    if (res.ok || res.status === 409) {
      setFeedback({
        type: 'success',
        message: res.ok
          ? `Bienvenido/a ${match.full_name}. Entrada registrada correctamente.`
          : res.message,
        client: match,
      });
      setDocInput('');
    } else {
      setFeedback({
        type: 'blocked',
        message: res.message,
        client: match,
      });
    }
  };

  const handleOverride = async (client: Client) => {
    const res = await onCheckInAttempt(client, true, 'Autorizado excepcionalmente en recepción');
    if (res.ok) {
      setFeedback({
        type: 'success',
        message: `Ingreso excepcional autorizado y auditado para ${client.full_name}.`,
        client,
      });
      setDocInput('');
    }
  };

  return (
    <section>
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Control de Asistencia (Check-in)</h1>
          <p className="welcome-sub">
            Validación estricta de vigencia en recepción (DP-003): bloquea membresías vencidas salvo autorización auditada.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Terminal de Ingreso por Documento o Nombre</div>
          </div>
          <form onSubmit={handleKioskSubmit}>
            <div className="form-group">
              <label className="form-label">Documento / Cédula o Nombre del Miembro *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 1020456789 o Carlos Martínez"
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-green"
              style={{ width: '100%', justifyContent: 'center', padding: 11 }}
            >
              Validar Vigencia y Registrar Entrada
            </button>
          </form>

          {feedback && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                backgroundColor:
                  feedback.type === 'success'
                    ? '#dcfce7'
                    : feedback.type === 'blocked'
                    ? '#fef3c7'
                    : '#fee2e2',
                color:
                  feedback.type === 'success'
                    ? '#166534'
                    : feedback.type === 'blocked'
                    ? '#92400e'
                    : '#991b1b',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {feedback.type === 'success'
                  ? 'ACCESO PERMITIDO'
                  : feedback.type === 'blocked'
                  ? `ACCESO BLOQUEADO (${feedback.client?.full_name})`
                  : 'MIEMBRO NO ENCONTRADO'}
              </div>
              <div style={{ fontSize: 12.5, marginBottom: feedback.type === 'blocked' ? 12 : 0 }}>
                {feedback.message}
              </div>

              {feedback.type === 'blocked' && feedback.client && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-green"
                    onClick={() => onOpenQuickRenew(feedback.client!)}
                  >
                    Renovar Membresía Ahora
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleOverride(feedback.client!)}
                  >
                    Autorizar Excepción (Auditado)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Bitácora de Entradas Registradas ({attendances.length})</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fit-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Miembro</th>
                  <th>Documento</th>
                  <th>Modalidad</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                      No hay entradas registradas todavía.
                    </td>
                  </tr>
                ) : (
                  attendances.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        {a.check_in_time.split(' ')[0]} • {formatTime12h(a.check_in_time)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{a.full_name}</td>
                      <td>{a.document_id}</td>
                      <td>
                        {a.was_overridden ? (
                          <span className="pill-amber">Autorizado Manual</span>
                        ) : (
                          <span className="pill-green">Normal</span>
                        )}
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
