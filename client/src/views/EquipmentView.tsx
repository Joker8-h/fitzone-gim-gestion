import React from 'react';
import type { EquipmentItem } from '../types/api';

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
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{eq.name}</td>
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
