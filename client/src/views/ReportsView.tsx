import React from 'react';
import type { Client, DashboardMetrics, AuditLog } from '../types/api';

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
