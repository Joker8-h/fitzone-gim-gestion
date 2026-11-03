import React, { useState } from 'react';
import type { Client } from '../types/api';
import { getFallbackAvatar } from '../utils/format';

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
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{c.full_name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Estado: {c.status}</div>
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
