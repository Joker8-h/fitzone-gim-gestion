import React, { useState, useEffect } from 'react';
import type { Client, MembershipPlan } from '../../types/api';
import { formatCOP } from '../../utils/format';

// 1. Modal Crear / Editar Miembro (DP-001)
interface ClientModalProps {
  isOpen: boolean;
  editingClient: Client | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    documentId: string;
    fullName: string;
    phone: string;
    notes?: string;
    status?: 'ACTIVO' | 'INACTIVO';
  }) => Promise<void>;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, editingClient, onClose, onSave }) => {
  const [documentId, setDocumentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setDocumentId(editingClient.document_id);
      setFullName(editingClient.full_name);
      setPhone(editingClient.phone);
      setNotes(editingClient.notes || '');
      setStatus(editingClient.status);
    } else {
      setDocumentId('');
      setFullName('');
      setPhone('');
      setNotes('');
      setStatus('ACTIVO');
    }
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        id: editingClient?.id,
        documentId,
        fullName,
        phone,
        notes,
        status,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
          {editingClient ? 'Editar Miembro' : 'Registrar Nuevo Miembro'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Documento / Cédula *</label>
            <input
              type="text"
              className="form-input"
              required
              disabled={!!editingClient}
              placeholder="Ej: 1020456789"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Carlos Martínez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono WhatsApp *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: 3104567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {editingClient && (
            <div className="form-group">
              <label className="form-label">Estado del Miembro</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVO' | 'INACTIVO')}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Observaciones (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Objetivo físico o nota médica..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Modal de Renovación Rápida (DP-002: Suma días al vencimiento actual)
interface QuickRenewModalProps {
  isOpen: boolean;
  client: Client | null;
  plans: MembershipPlan[];
  onClose: () => void;
  onOpenPlanModal: () => void;
  onConfirm: (payload: {
    clientId: string;
    planId: string;
    paymentMethod: string;
    pricePaid: number;
    reference?: string;
  }) => Promise<void>;
}

export const QuickRenewModal: React.FC<QuickRenewModalProps> = ({
  isOpen,
  client,
  plans,
  onClose,
  onOpenPlanModal,
  onConfirm,
}) => {
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [pricePaid, setPricePaid] = useState(100000);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plans.length > 0) {
      setPlanId(plans[0].id);
      setPricePaid(plans[0].price);
    } else {
      setPlanId('');
    }
    setReference('');
  }, [plans, isOpen]);

  if (!isOpen || !client) return null;

  const handlePlanChange = (newId: string) => {
    setPlanId(newId);
    const found = plans.find((p) => p.id === newId);
    if (found) setPricePaid(found.price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    setSubmitting(true);
    try {
      await onConfirm({
        clientId: client.id,
        planId,
        paymentMethod,
        pricePaid: Number(pricePaid),
        reference: reference || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
          Renovar / Asignar Membresía
        </h3>
        <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>
          Miembro: <strong>{client.full_name}</strong> ({client.document_id}) • Vencimiento actual:{' '}
          <strong>{client.membership_end_date || 'Sin plan vigente'}</strong>
        </p>

        {plans.length === 0 ? (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              color: '#92400e',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              No hay planes de membresía configurados aún
            </div>
            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
              Para asignar o renovar una membresía, primero debes registrar al menos un plan en el catálogo (por ejemplo: Mensualidad, Trimestre o Pase Diario).
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-green"
                onClick={() => {
                  onOpenPlanModal();
                }}
              >
                + Crear Nuevo Plan Ahora
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Seleccionar Plan *</label>
                <button
                  type="button"
                  className="card-link"
                  style={{ fontSize: 11.5 }}
                  onClick={onOpenPlanModal}
                >
                  + Crear otro plan
                </button>
              </div>
              <select
                className="form-select"
                value={planId}
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
                  <option value="TRANSFERENCIA">Transferencia / Nequi</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto Recibido (COP) *</label>
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
              <label className="form-label">Referencia de Pago (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Comprobante Nequi #83910"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div
              style={{
                background: '#e6f4ee',
                padding: '9px 12px',
                borderRadius: 10,
                fontSize: 12,
                color: '#15803d',
                marginBottom: 14,
              }}
            >
              <strong>Regla DP-002 activa:</strong> Si la membresía actual aún no ha vencido, los días del nuevo plan se sumarán automáticamente al final de su fecha de vencimiento actual.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-green" disabled={submitting || !planId}>
                {submitting ? 'Procesando...' : 'Confirmar Pago y Renovar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// 3. Modal Crear Nuevo Plan
interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; durationDays: number; price: number; description?: string }) => Promise<void>;
}

export const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(100000);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, durationDays: Number(durationDays), price: Number(price), description });
    setName('');
    setDescription('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Crear Plan de Membresía</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Plan *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Plan Mensual"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Duración (Días) *</label>
              <input
                type="number"
                className="form-input"
                required
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Precio (COP) *</label>
              <input
                type="number"
                className="form-input"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input
              type="text"
              className="form-input"
              placeholder="Acceso ilimitado a zonas y clases"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Modal Crear Clase Grupal
interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    capacity: number;
    colorTheme: string;
  }) => Promise<void>;
}

export const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00 - 19:00');
  const [capacity, setCapacity] = useState(20);
  const [colorTheme, setColorTheme] = useState('emerald');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, instructorName, scheduleTime, capacity: Number(capacity), colorTheme });
    setName('');
    setInstructorName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Programar Nueva Clase</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de la Clase *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: HIIT Nocturno"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Entrenador / Instructor *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Carlos Ruiz"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Horario *</label>
              <input
                type="text"
                className="form-input"
                required
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacidad Máxima *</label>
              <input
                type="number"
                className="form-input"
                required
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color Distintivo</label>
            <select className="form-select" value={colorTheme} onChange={(e) => setColorTheme(e.target.value)}>
              <option value="emerald">Verde FITZONE</option>
              <option value="slate">Gris Oscuro (Spinning)</option>
              <option value="rose">Rojo / Vino (Funcional)</option>
              <option value="teal">Verde Azulado (CrossFit)</option>
              <option value="amber">Ámbar / Dorado (Yoga)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Clase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. Modal Crear Evento
interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; dayNum: string; monthShort: string; timeRange: string }) => Promise<void>;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [dayNum, setDayNum] = useState('29');
  const [monthShort, setMonthShort] = useState('OCT');
  const [timeRange, setTimeRange] = useState('09:00 AM - 11:00 AM');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title, dayNum, monthShort, timeRange });
    setTitle('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Publicar Próximo Evento</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título del Evento *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Torneo Interno de Fuerza"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Día (Número) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={dayNum}
                onChange={(e) => setDayNum(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mes (3 letras) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={monthShort}
                onChange={(e) => setMonthShort(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Horario *</label>
            <input
              type="text"
              className="form-input"
              required
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Publicar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. Modal Crear Empleado
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    fullName: string;
    role: string;
    specialty: string;
    phone: string;
    salary: number;
  }) => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Entrenador');
  const [specialty, setSpecialty] = useState('Musculación & Cardio');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState(1750000);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ fullName, role, specialty, phone, salary: Number(salary) });
    setFullName('');
    setPhone('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Registrar Empleado / Entrenador</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Camilo Vargas"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Cargo *</label>
              <input
                type="text"
                className="form-input"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Especialidad</label>
              <input
                type="text"
                className="form-input"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Teléfono *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="3109876543"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salario Base (COP)</label>
              <input
                type="number"
                className="form-input"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Empleado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 7. Modal Agregar Equipo
interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; category: string; status: string }) => Promise<void>;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cardio');
  const [status, setStatus] = useState('Disponible');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, category, status });
    setName('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Agregar Equipo al Gimnasio</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre del Equipo / Máquina *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ej: Prensa de Piernas 45°"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Cardio">Cardio</option>
                <option value="Máquinas">Máquinas</option>
                <option value="Peso Libre">Peso Libre</option>
                <option value="Spinning">Spinning</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado Inicial</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Disponible">Disponible</option>
                <option value="En uso">En uso</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-green">
              Guardar Equipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
