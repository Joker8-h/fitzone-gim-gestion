import React, { useState } from 'react';
import type { SystemUser } from '../../types/api';

interface UserManagementModalProps {
  isOpen: boolean;
  users: SystemUser[];
  onClose: () => void;
  onCreateUser: (payload: { name: string; email: string; password: string; role: string }) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  users,
  onClose,
  onCreateUser,
  onDeleteUser,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RECEPCION');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateUser({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          Usuarios y Contraseñas de Acceso al Sistema
        </h3>
        <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>
          Crea cuentas con usuario/correo y contraseña encriptada (scrypt) para administradores o recepcionistas.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#f8fafc',
            padding: 14,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#0f172a' }}>
            + Crear Nuevo Usuario de Acceso
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Nombre Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Sofía Recepción"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Usuario o Correo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: recepcion@fitzone.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Contraseña (mín. 6 caracteres) *</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Rol en el Gimnasio</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="ADMIN">Administrador Total (ADMIN)</option>
                <option value="RECEPCION">Recepción / Caja (RECEPCION)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-green" disabled={submitting}>
            {submitting ? 'Creando usuario...' : 'Guardar Nuevo Usuario y Contraseña'}
          </button>
        </form>

        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#0f172a' }}>
          Usuarios Habilitados ({users.length})
        </div>
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
          <table className="fit-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario / Correo</th>
                <th>Rol</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="pill-green">{u.role}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {users.length > 1 && (
                      <button
                        type="button"
                        className="action-icon-btn"
                        title="Eliminar usuario"
                        onClick={() => onDeleteUser(u.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
