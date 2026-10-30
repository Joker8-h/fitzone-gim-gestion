import React, { useState } from 'react';
import type { TabId, SystemUser } from '../../types/api';

interface TopbarProps {
  currentUser: SystemUser;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  alertCount: number;
  expiringCount: number;
  expiredCount: number;
  onNavigate: (tab: TabId) => void;
  onOpenNewClient: () => void;
  onOpenUserModal: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  globalSearch,
  onGlobalSearchChange,
  alertCount,
  expiringCount,
  expiredCount,
  onNavigate,
  onOpenNewClient,
  onOpenUserModal,
  onLogout,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          aria-label="Buscar miembros, clases, equipos"
          placeholder="Buscar miembros, clases, equipos..."
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
        />
      </div>

      <div className="topbar-actions">
        {/* Botón directo para gestionar Usuarios y Contraseñas */}
        <button
          type="button"
          className="filter-tab"
          onClick={onOpenUserModal}
          title="Crear o gestionar usuarios y contraseñas de acceso"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Usuarios</span>
        </button>

        {/* Botón de Notificaciones con panel desplegable interactivo */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="notif-btn"
            aria-label="Notificaciones del sistema"
            onClick={() => {
              setShowNotifMenu((prev) => !prev);
              setShowAdminMenu(false);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {alertCount > 0 && <span className="notif-badge">{alertCount}</span>}
          </button>

          {showNotifMenu && (
            <div className="notif-dropdown">
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', marginBottom: 10 }}>
                Alertas Operativas FITZONE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <div
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('reports');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: '#fffbeb',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#92400e',
                  }}
                >
                  <strong>{expiringCount} membresía(s)</strong> próximas a vencer (3 días o menos). Clic para revisar.
                </div>
                <div
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('reports');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: '#fef2f2',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#991b1b',
                  }}
                >
                  <strong>{expiredCount} membresía(s)</strong> vencidas pendientes de renovación.
                </div>
                <div
                  onClick={() => {
                    setShowNotifMenu(false);
                    onNavigate('whatsapp');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: '#e6f4ee',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#15803d',
                  }}
                >
                  <strong>Seguimiento WhatsApp IA:</strong> Automatización lista para procesar recordatorios.
                </div>
              </div>
              <button
                type="button"
                className="btn-green"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setShowNotifMenu(false);
                  onNavigate('whatsapp');
                }}
              >
                Abrir Panel WhatsApp IA
              </button>
            </div>
          )}
        </div>

        {/* Perfil Administrador con menú rápido y Cerrar Sesión */}
        <div style={{ position: 'relative' }}>
          <div
            className="admin-profile"
            onClick={() => {
              setShowAdminMenu((prev) => !prev);
              setShowNotifMenu(false);
            }}
          >
            <div className="admin-avatar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
              </svg>
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {currentUser.name || 'Administrador'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{currentUser.role || 'Admin'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {showAdminMenu && (
            <div className="notif-dropdown" style={{ width: 250 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                Sesión: {currentUser.email}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  className="filter-tab"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    setShowAdminMenu(false);
                    onOpenUserModal();
                  }}
                >
                  Crear / Gestionar Usuarios
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    setShowAdminMenu(false);
                    onOpenNewClient();
                  }}
                >
                  + Registrar Nuevo Miembro
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    setShowAdminMenu(false);
                    onNavigate('attendance');
                  }}
                >
                  Terminal Check-in
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    setShowAdminMenu(false);
                    onNavigate('reports');
                  }}
                >
                  Bitácora de Auditoría
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    marginTop: 4,
                  }}
                  onClick={() => {
                    setShowAdminMenu(false);
                    onLogout();
                  }}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
