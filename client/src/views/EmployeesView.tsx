import React from 'react';
import type { Employee } from '../types/api';
import { formatCOP } from '../utils/format';

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
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{emp.full_name}</td>
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
