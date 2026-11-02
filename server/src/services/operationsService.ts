import { query, queryOne, run } from '../db/database.js';
import { notFound } from '../errors.js';
import crypto from 'crypto';

export const operationsService = {
  // --- CLASES (gym_classes) ---
  async listClasses() {
    return query('SELECT * FROM gym_classes ORDER BY schedule_time ASC');
  },

  async createClass(data: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    enrolledCount?: number;
    capacity?: number;
    colorTheme?: string;
    status?: string;
  }) {
    const id = crypto.randomUUID();
    await run(`
      INSERT INTO gym_classes (id, name, instructor_name, schedule_time, enrolled_count, capacity, color_theme, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.name.trim(),
      data.instructorName.trim(),
      data.scheduleTime.trim(),
      data.enrolledCount ?? 0,
      data.capacity ?? 20,
      data.colorTheme || 'emerald',
      data.status || 'PROGRAMADA'
    ]);
    return queryOne('SELECT * FROM gym_classes WHERE id = ?', [id]);
  },

  async updateClassEnrollment(id: string, delta: number) {
    const current = await queryOne<any>('SELECT * FROM gym_classes WHERE id = ?', [id]);
    if (!current) throw notFound('Clase no encontrada');
    const nextCount = Math.max(0, Math.min(current.capacity, current.enrolled_count + delta));
    await run('UPDATE gym_classes SET enrolled_count = ? WHERE id = ?', [nextCount, id]);
    return queryOne('SELECT * FROM gym_classes WHERE id = ?', [id]);
  },

  async deleteClass(id: string) {
    await run('DELETE FROM gym_classes WHERE id = ?', [id]);
    return { deleted: true };
  },

  // --- EVENTOS (gym_events) ---
  async listEvents() {
    return query('SELECT * FROM gym_events ORDER BY event_date ASC');
  },

  async createEvent(data: {
    title: string;
    eventDate: string;
    dayNum: string;
    monthShort: string;
    timeRange: string;
  }) {
    const id = crypto.randomUUID();
    await run(`
      INSERT INTO gym_events (id, title, event_date, day_num, month_short, time_range)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.title.trim(),
      data.eventDate.trim(),
      data.dayNum.trim(),
      data.monthShort.trim().toUpperCase(),
      data.timeRange.trim()
    ]);
    return queryOne('SELECT * FROM gym_events WHERE id = ?', [id]);
  },

  async deleteEvent(id: string) {
    await run('DELETE FROM gym_events WHERE id = ?', [id]);
    return { deleted: true };
  },

  // --- EMPLEADOS (employees) ---
  async listEmployees() {
    return query('SELECT * FROM employees ORDER BY created_at DESC');
  },

  async createEmployee(data: {
    fullName: string;
    role: string;
    specialty?: string;
    phone: string;
    salary?: number;
  }) {
    const id = crypto.randomUUID();
    await run(`
      INSERT INTO employees (id, full_name, role, specialty, phone, salary, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
    `, [
      id,
      data.fullName.trim(),
      data.role.trim(),
      data.specialty?.trim() || 'General',
      data.phone.trim(),
      Number(data.salary) || 0
    ]);
    return queryOne('SELECT * FROM employees WHERE id = ?', [id]);
  },

  async toggleEmployeeStatus(id: string) {
    const current = await queryOne<any>('SELECT * FROM employees WHERE id = ?', [id]);
    if (!current) throw notFound('Empleado no encontrado');
    const nextStatus = current.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    await run('UPDATE employees SET status = ? WHERE id = ?', [nextStatus, id]);
    return queryOne('SELECT * FROM employees WHERE id = ?', [id]);
  },

  async deleteEmployee(id: string) {
    await run('DELETE FROM employees WHERE id = ?', [id]);
    return { deleted: true };
  },

  // --- EQUIPOS (equipment) ---
  async listEquipment() {
    return query('SELECT * FROM equipment ORDER BY created_at ASC');
  },

  async createEquipment(data: {
    name: string;
    category: string;
    status?: string;
    lastMaintenance?: string;
  }) {
    const id = crypto.randomUUID();
    const todayFormatted = new Date().toLocaleDateString('es-CO');
    await run(`
      INSERT INTO equipment (id, name, category, status, last_maintenance)
      VALUES (?, ?, ?, ?, ?)
    `, [
      id,
      data.name.trim(),
      data.category.trim(),
      data.status || 'Disponible',
      data.lastMaintenance?.trim() || todayFormatted
    ]);
    return queryOne('SELECT * FROM equipment WHERE id = ?', [id]);
  },

  async updateEquipmentStatus(id: string, status: string, lastMaintenance?: string) {
    const current = await queryOne<any>('SELECT * FROM equipment WHERE id = ?', [id]);
    if (!current) throw notFound('Equipo no encontrado');
    const maint = lastMaintenance || current.last_maintenance;
    await run('UPDATE equipment SET status = ?, last_maintenance = ? WHERE id = ?', [status, maint, id]);
    return queryOne('SELECT * FROM equipment WHERE id = ?', [id]);
  },

  async deleteEquipment(id: string) {
    await run('DELETE FROM equipment WHERE id = ?', [id]);
    return { deleted: true };
  }
};
