import { db } from '../db/database.js';
import crypto from 'crypto';

export const operationsService = {
  // --- CLASES (gym_classes) ---
  listClasses() {
    // @ts-ignore
    return db.prepare('SELECT * FROM gym_classes ORDER BY schedule_time ASC').all() as any[];
  },

  createClass(data: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    enrolledCount?: number;
    capacity?: number;
    colorTheme?: string;
    status?: string;
  }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO gym_classes (id, name, instructor_name, schedule_time, enrolled_count, capacity, color_theme, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.instructorName.trim(),
      data.scheduleTime.trim(),
      data.enrolledCount ?? 0,
      data.capacity ?? 20,
      data.colorTheme || 'emerald',
      data.status || 'PROGRAMADA'
    );
    // @ts-ignore
    return db.prepare('SELECT * FROM gym_classes WHERE id = ?').get(id);
  },

  updateClassEnrollment(id: string, delta: number) {
    // @ts-ignore
    const current = db.prepare('SELECT * FROM gym_classes WHERE id = ?').get(id) as any;
    if (!current) throw new Error('Clase no encontrada');
    const nextCount = Math.max(0, Math.min(current.capacity, current.enrolled_count + delta));
    db.prepare('UPDATE gym_classes SET enrolled_count = ? WHERE id = ?').run(nextCount, id);
    // @ts-ignore
    return db.prepare('SELECT * FROM gym_classes WHERE id = ?').get(id);
  },

  deleteClass(id: string) {
    db.prepare('DELETE FROM gym_classes WHERE id = ?').run(id);
    return { deleted: true };
  },

  // --- EVENTOS (gym_events) ---
  listEvents() {
    // @ts-ignore
    return db.prepare('SELECT * FROM gym_events ORDER BY event_date ASC').all() as any[];
  },

  createEvent(data: {
    title: string;
    eventDate: string;
    dayNum: string;
    monthShort: string;
    timeRange: string;
  }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO gym_events (id, title, event_date, day_num, month_short, time_range)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title.trim(),
      data.eventDate.trim(),
      data.dayNum.trim(),
      data.monthShort.trim().toUpperCase(),
      data.timeRange.trim()
    );
    // @ts-ignore
    return db.prepare('SELECT * FROM gym_events WHERE id = ?').get(id);
  },

  deleteEvent(id: string) {
    db.prepare('DELETE FROM gym_events WHERE id = ?').run(id);
    return { deleted: true };
  },

  // --- EMPLEADOS (employees) ---
  listEmployees() {
    // @ts-ignore
    return db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all() as any[];
  },

  createEmployee(data: {
    fullName: string;
    role: string;
    specialty?: string;
    phone: string;
    salary?: number;
  }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO employees (id, full_name, role, specialty, phone, salary, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
    `).run(
      id,
      data.fullName.trim(),
      data.role.trim(),
      data.specialty?.trim() || 'General',
      data.phone.trim(),
      Number(data.salary) || 0
    );
    // @ts-ignore
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  },

  toggleEmployeeStatus(id: string) {
    // @ts-ignore
    const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
    if (!current) throw new Error('Empleado no encontrado');
    const nextStatus = current.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    db.prepare('UPDATE employees SET status = ? WHERE id = ?').run(nextStatus, id);
    // @ts-ignore
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  },

  deleteEmployee(id: string) {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    return { deleted: true };
  },

  // --- EQUIPOS (equipment) ---
  listEquipment() {
    // @ts-ignore
    return db.prepare('SELECT * FROM equipment ORDER BY created_at ASC').all() as any[];
  },

  createEquipment(data: {
    name: string;
    category: string;
    status?: string;
    lastMaintenance?: string;
  }) {
    const id = crypto.randomUUID();
    const todayFormatted = new Date().toLocaleDateString('es-CO');
    db.prepare(`
      INSERT INTO equipment (id, name, category, status, last_maintenance)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.category.trim(),
      data.status || 'Disponible',
      data.lastMaintenance?.trim() || todayFormatted
    );
    // @ts-ignore
    return db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
  },

  updateEquipmentStatus(id: string, status: string, lastMaintenance?: string) {
    // @ts-ignore
    const current = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id) as any;
    if (!current) throw new Error('Equipo no encontrado');
    const maint = lastMaintenance || current.last_maintenance;
    db.prepare('UPDATE equipment SET status = ?, last_maintenance = ? WHERE id = ?').run(status, maint, id);
    // @ts-ignore
    return db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
  },

  deleteEquipment(id: string) {
    db.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    return { deleted: true };
  }
};
