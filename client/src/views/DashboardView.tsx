import React, { useState, useMemo } from 'react';
import type { Client, DashboardMetrics, TabId } from '../types/api';
import { formatCOP, formatTime12h, formatDateShort, getFallbackAvatar } from '../utils/format';
import { AttendanceLineChart } from '../components/charts/AttendanceLineChart';
import { MonthlyRevenueBars } from '../components/charts/MonthlyRevenueBars';
import { PlanDonutChart } from '../components/charts/PlanDonutChart';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  clients: Client[];
  externalSearch: string;
  onNavigate: (tab: TabId) => void;
  onOpenNewClient: () => void;
  onOpenEditClient: (client: Client) => void;
  onOpenQuickRenew: (client: Client) => void;
  onQuickCheckIn: (client: Client) => void;
  onCycleEquipment: (id: string, currentStatus: string) => void;
  onAdjustClassQuota: (id: string, delta: number) => void;
  onOpenClassModal: () => void;
  onOpenEventModal: () => void;
  onOpenEquipmentModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  clients,
  externalSearch,
  onNavigate,
  onOpenNewClient,
  onOpenEditClient,
  onOpenQuickRenew,
  onQuickCheckIn,
  onCycleEquipment,
  onAdjustClassQuota,
  onOpenClassModal,
  onOpenEventModal,
  onOpenEquipmentModal,
}) => {
  const [rangeMode, setRangeMode] = useState<'7d' | '14d' | '30d'>('7d');
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'ACTIVO' | 'INACTIVO'>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const effectiveSearch = (localSearch || externalSearch).trim().toLowerCase();

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (memberFilter !== 'ALL' && c.status !== memberFilter) return false;
      if (effectiveSearch) {
        return (
          c.full_name.toLowerCase().includes(effectiveSearch) ||
          c.document_id.toLowerCase().includes(effectiveSearch) ||
          (c.plan_name || '').toLowerCase().includes(effectiveSearch)
        );
      }
      return true;
    });
  }, [clients, memberFilter, effectiveSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClients = filteredClients.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 100% Datos reales desde la base de datos SQLite (0 cuando está en blanco)
  const activeCountDisplay = metrics?.activeClients ?? 0;
  const todayIncomeDisplay = metrics?.todayIncomes ?? 0;
  const classesList = metrics?.classesToday || [];
  const inCourseCount = classesList.filter((c) => c.status === 'EN_CURSO').length;
  const attendancePctDisplay = metrics?.attendancePercentage ?? 0;
  const monthIncomeDisplay = metrics?.financesMonth?.totalIncomes ?? 0;

  const totalBadge = clients.length;
  const activeBadge = clients.filter((c) => c.status === 'ACTIVO').length;
  const inactiveBadge = clients.filter((c) => c.status === 'INACTIVO').length;

  const renderClassIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('spin')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
        </svg>
      );
    }
    if (n.includes('func')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5l11 11" />
          <path d="M21 21l-1-1" />
          <path d="M3 3l1 1" />
          <path d="M18 22l4-4" />
          <path d="M2 6l4-4" />
        </svg>
      );
    }
    if (n.includes('cross')) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      </svg>
    );
  };

  const renderEquipmentIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('caminadora')) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8">
          <path d="M18 4l-4 12H4l2 4h14l2-4" />
          <line x1="14" y1="7" x2="20" y2="7" />
        </svg>
      );
    }
    if (n.includes('bicicleta') || n.includes('spinning')) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8">
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M6 17l5-8h5l2 8" />
          <path d="M9 9h4" />
        </svg>
      );
    }
    if (n.includes('pesas')) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8">
          <path d="M6.5 6.5l11 11" />
          <path d="M18 22l4-4" />
          <path d="M2 6l4-4" />
          <path d="M3 10l7-7" />
          <path d="M14 21l7-7" />
        </svg>
      );
    }
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8">
        <rect x="6" y="3" width="12" height="18" rx="1" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    );
  };

  return (
    <section>
      {/* Cabecera de Bienvenida */}
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">Bienvenido, Administrador</h1>
          <p className="welcome-sub">Aquí tienes un resumen general de tu gimnasio en tiempo real.</p>
        </div>
        <div className="welcome-meta">
          <div className="date-chip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="status-open-pill">
            <span className="status-open-dot" />
            <span>Gimnasio abierto</span>
          </div>
        </div>
      </div>

      {/* FILA 1: 4 TARJETAS KPI REALES */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('clients')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="kpi-label">Miembros activos</div>
            <div className="kpi-value">{activeCountDisplay}</div>
            <div className="kpi-trend">{totalBadge} registrados en total</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('finances')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="kpi-label">Ingresos del día</div>
            <div className="kpi-value">{formatCOP(todayIncomeDisplay)}</div>
            <div className="kpi-trend">Recaudo de hoy</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('classes')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div className="kpi-label">Clases hoy</div>
            <div className="kpi-value">{classesList.length}</div>
            <div className="kpi-trend neutral">{inCourseCount} en curso</div>
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('attendance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="kpi-label">Asistencia del día</div>
            <div className="kpi-value">{attendancePctDisplay}%</div>
            <div className="kpi-trend">{metrics?.todayAttendancesCount || 0} entrada(s) hoy</div>
          </div>
        </div>
      </div>

      {/* FILA 2: Asistencia 7 días + Clases de hoy + Miembros recientes */}
      <div className="dashboard-row-2">
        {/* Card 1: Asistencia de los últimos 7 días */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>{`Asistencia — últimos ${rangeMode === '30d' ? 30 : rangeMode === '14d' ? 14 : 7} días`}</span>
            </div>
            <select
              aria-label="Rango de días de asistencia"
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value as '7d' | '14d' | '30d')}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 12,
                color: '#cbd5e1',
                background: '#121a2d',
                cursor: 'pointer',
              }}
            >
              <option value="7d">Últimos 7 días</option>
              <option value="14d">Últimos 14 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </div>
          <AttendanceLineChart rangeMode={rangeMode} rawDays={metrics?.attendanceLast30Days} />
        </div>

        {/* Card 2: Clases de hoy */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Clases de hoy</span>
            </div>
            <button type="button" className="card-link" onClick={() => onNavigate('classes')}>
              Ver todas →
            </button>
          </div>
          <div className="class-list">
            {classesList.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#64748b', padding: '12px 0' }}>
                <div style={{ marginBottom: 10 }}>No hay clases programadas hoy.</div>
                <button type="button" className="btn-green" onClick={onOpenClassModal}>
                  + Programar Clase
                </button>
              </div>
            ) : (
              classesList.slice(0, 4).map((c) => {
                const pct = Math.min(100, Math.round((c.enrolled_count / (c.capacity || 20)) * 100));
                return (
                  <div
                    key={c.id}
                    className="class-item"
                    style={{ cursor: 'pointer' }}
                    title="Clic para inscribir +1 alumno rápidamente"
                    onClick={() => onAdjustClassQuota(c.id, 1)}
                  >
                    <div className="class-item-left">
                      <div className={`class-badge-icon ${c.color_theme || 'slate'}`}>
                        {renderClassIcon(c.name)}
                      </div>
                      <div>
                        <div className="class-time">{c.schedule_time}</div>
                        <div className="class-name">{c.name}</div>
                        <div className="class-coach">{c.instructor_name}</div>
                      </div>
                    </div>
                    <div className="class-progress-wrap">
                      <div className="class-quota">
                        {c.enrolled_count} / {c.capacity}
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 3: Miembros recientes */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
              </svg>
              <span>Miembros recientes</span>
            </div>
            <button type="button" className="card-link" onClick={() => onNavigate('attendance')}>
              Ver todos →
            </button>
          </div>
          <div className="recent-member-list">
            {(metrics?.recentAttendances || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#64748b', padding: '12px 0' }}>
                <div style={{ marginBottom: 10 }}>Aún no se han registrado entradas hoy.</div>
                <button type="button" className="filter-tab" onClick={() => onNavigate('attendance')}>
                  Ir a Terminal Check-in
                </button>
              </div>
            ) : (
              (metrics?.recentAttendances || []).slice(0, 4).map((r) => {
                const fallback = getFallbackAvatar(r.full_name);
                return (
                  <div key={r.id} className="recent-member-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={r.avatar_url || fallback}
                        alt={r.full_name}
                        className="member-avatar"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = fallback;
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>{r.full_name}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                          Plan {(r.plan_name || 'activo').toLowerCase()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="pill-green">Entrada</span>
                      <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
                        {formatTime12h(r.check_in_time)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FILA 3: Lista de miembros + Próximos eventos + Estado de equipos */}
      <div className="dashboard-row-3">
        {/* Card 4: Lista de miembros */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>Lista de miembros</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', width: 210 }}>
                <input
                  type="search"
                  placeholder="Buscar miembro..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    background: '#121a2d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 999,
                    padding: '6px 12px 6px 30px',
                    fontSize: 12,
                    color: '#f8fafc',
                    outline: 'none',
                  }}
                />
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <button type="button" className="btn-green" onClick={onOpenNewClient}>
                + Nuevo miembro
              </button>
            </div>
          </div>

          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab ${memberFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => {
                setMemberFilter('ALL');
                setCurrentPage(1);
              }}
            >
              Todos ({totalBadge})
            </button>
            <button
              type="button"
              className={`filter-tab ${memberFilter === 'ACTIVO' ? 'active' : ''}`}
              onClick={() => {
                setMemberFilter('ACTIVO');
                setCurrentPage(1);
              }}
            >
              Activos ({activeBadge})
            </button>
            <button
              type="button"
              className={`filter-tab ${memberFilter === 'INACTIVO' ? 'active' : ''}`}
              onClick={() => {
                setMemberFilter('INACTIVO');
                setCurrentPage(1);
              }}
            >
              Inactivos ({inactiveBadge})
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="fit-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '22px 8px', color: '#64748b' }}>
                      No hay miembros registrados aún. Haz clic en <strong>"+ Nuevo miembro"</strong> para registrar el primero.
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((c) => {
                    const fallback = getFallbackAvatar(c.full_name);
                    const isAct = c.status === 'ACTIVO' && c.membership_status === 'VIGENTE';
                    const lastAcc = c.last_access ? formatTime12h(c.last_access) : 'Sin ingresos';

                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <img
                              src={c.avatar_url || fallback}
                              alt={c.full_name}
                              className="member-avatar-sm"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = fallback;
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#ffffff' }}>{c.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{c.plan_name || 'Sin plan'}</td>
                        <td>
                          {isAct ? (
                            <span className="pill-green">Activo</span>
                          ) : (
                            <span className="pill-red">{c.membership_status === 'SIN_MEMBRESIA' ? 'Sin plan' : 'Vencido'}</span>
                          )}
                        </td>
                        <td style={{ color: '#475569' }}>{lastAcc}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Editar miembro"
                            onClick={() => onOpenEditClient(c)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Renovar / Asignar Membresía"
                            onClick={() => onOpenQuickRenew(c)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Registrar Entrada (Check-in)"
                            onClick={() => onQuickCheckIn(c)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-btn ${safePage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="page-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Card 5: Próximos eventos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Próximos eventos</span>
            </div>
            <button type="button" className="card-link" onClick={() => onNavigate('classes')}>
              Ver calendario →
            </button>
          </div>
          <div className="event-list">
            {(metrics?.upcomingEvents || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#64748b', padding: '12px 0' }}>
                <div style={{ marginBottom: 10 }}>No hay eventos programados actualmente.</div>
                <button type="button" className="btn-green" onClick={onOpenEventModal}>
                  + Publicar Evento
                </button>
              </div>
            ) : (
              (metrics?.upcomingEvents || []).slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="event-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onNavigate('classes')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="event-date-box">
                      <span className="event-day">{ev.day_num}</span>
                      <span className="event-month">{ev.month_short}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{ev.title}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{ev.time_range}</div>
                    </div>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 6: Estado de equipos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span>Estado de equipos</span>
            </div>
            <button type="button" className="card-link" onClick={() => onNavigate('equipment')}>
              Ver todos →
            </button>
          </div>
          <div className="equip-list">
            {(metrics?.equipmentList || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#64748b', padding: '12px 0' }}>
                <div style={{ marginBottom: 10 }}>No hay equipos registrados aún.</div>
                <button type="button" className="btn-green" onClick={onOpenEquipmentModal}>
                  + Agregar Equipo
                </button>
              </div>
            ) : (
              (metrics?.equipmentList || []).slice(0, 5).map((eq) => {
                const color = eq.status === 'Mantenimiento' ? '#d97706' : '#16a34a';
                return (
                  <div
                    key={eq.id}
                    className="equip-item"
                    title="Clic para cambiar el estado del equipo"
                    onClick={() => onCycleEquipment(eq.id, eq.status)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {renderEquipmentIcon(eq.name)}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{eq.name}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color }}>{eq.status}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>Mant. {eq.last_maintenance}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FILA 4: Ingresos mensuales + Membresías más comunes + Últimos pagos */}
      <div className="dashboard-row-4">
        {/* Card 7: Ingresos mensuales */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 6 }}>
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Ingresos mensuales</span>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff' }}>{formatCOP(monthIncomeDisplay)}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 12 }}>
            Acumulado del mes actual
          </div>
          <MonthlyRevenueBars monthlyData={metrics?.monthlyRevenues} />
        </div>

        {/* Card 8: Membresías más comunes */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Membresías más comunes</span>
            </div>
          </div>
          <PlanDonutChart distribution={metrics?.planDistribution} />
        </div>

        {/* Card 9: Últimos pagos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f8e5f" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>Últimos pagos</span>
            </div>
            <button type="button" className="card-link" onClick={() => onNavigate('finances')}>
              Ver todos →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fit-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.recentPayments || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '18px 8px', color: '#64748b' }}>
                      Sin pagos registrados aún.
                    </td>
                  </tr>
                ) : (
                  (metrics?.recentPayments || []).slice(0, 4).map((p) => {
                    const fallback = getFallbackAvatar(p.full_name);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={p.avatar_url || fallback}
                              alt={p.full_name}
                              className="member-avatar-sm"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = fallback;
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#ffffff' }}>{p.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{p.plan_name}</td>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{formatCOP(p.amount)}</td>
                        <td style={{ color: '#94a3b8' }}>{formatDateShort(p.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
