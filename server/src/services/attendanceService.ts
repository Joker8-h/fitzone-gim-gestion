import { query, queryOne, run } from '../db/database.js';
import { membershipService } from './membershipService.js';
import { clientService } from './clientService.js';
import crypto from 'crypto';

export interface AttendanceRecord {
  id: string;
  client_id: string;
  full_name?: string;
  document_id?: string;
  phone?: string;
  check_in_time: string;
  was_overridden: number;
  override_reason?: string;
  registered_by?: string;
}

export interface CheckInResult {
  success: boolean;
  blocked: boolean;
  message: string;
  client?: any;
  membership?: any;
  attendance?: AttendanceRecord;
}

export const attendanceService = {
  // Marcaje de asistencia con regla estricta DP-003 (Bloqueo si está vencida)
  async checkIn(documentId: string, override = false, overrideReason?: string, registeredBy = 'Recepción'): Promise<CheckInResult> {
    const client = await clientService.getByDocument(documentId);
    if (!client) {
      return {
        success: false,
        blocked: true,
        message: `No se encontró ningún cliente con el documento "${documentId}".`,
      };
    }

    if (client.status === 'INACTIVO') {
      return {
        success: false,
        blocked: true,
        message: `El cliente ${client.full_name} se encuentra marcado como INACTIVO en el sistema.`,
        client,
      };
    }

    // Obtener membresía activa
    const membership = await membershipService.getLatestMembership(client.id);

    // Si no tiene membresía o está vencida
    const isExpired = !membership || membership.status === 'VENCIDA';

    if (isExpired && !override) {
      const detail = !membership
        ? 'El cliente no cuenta con ninguna membresía registrada.'
        : `La membresía (${membership.plan_name}) venció el ${membership.end_date} (hace ${Math.abs(membership.daysRemaining)} días).`;

      return {
        success: false,
        blocked: true,
        message: `ACCESO DENEGADO: ${detail}`,
        client,
        membership,
      };
    }

    // RF-011: Prevenir doble registro accidental (en los últimos 15 minutos)
    const recent = await queryOne<any>(`
      SELECT * FROM attendances
      WHERE client_id = ? AND check_in_time >= to_char(localtimestamp - interval '15 minutes', 'YYYY-MM-DD HH24:MI:SS')
      ORDER BY check_in_time DESC
      LIMIT 1
    `, [client.id]);

    if (recent && !override) {
      return {
        success: false,
        blocked: false,
        message: `Aviso: ${client.full_name} ya registró asistencia recientemente (${recent.check_in_time}).`,
        client,
        membership,
      };
    }

    // Registrar asistencia
    const attendanceId = crypto.randomUUID();
    await run(`
      INSERT INTO attendances (id, client_id, was_overridden, override_reason, registered_by)
      VALUES (?, ?, ?, ?, ?)
    `, [
      attendanceId,
      client.id,
      override ? 1 : 0,
      override ? (overrideReason?.trim() || 'Ingreso autorizado manualmente') : null,
      registeredBy
    ]);

    const attendance = (await queryOne<AttendanceRecord>('SELECT * FROM attendances WHERE id = ?', [attendanceId]))!;

    let warning = '';
    if (membership && membership.status === 'POR_VENCER') {
      warning = ` (¡Atención: su membresía vence en ${membership.daysRemaining} días, el ${membership.end_date}!)`;
    }

    return {
      success: true,
      blocked: false,
      message: override
        ? `Ingreso autorizado manualmente para ${client.full_name}.${warning}`
        : `¡Bienvenido(a), ${client.full_name}! Ingreso registrado correctamente.${warning}`,
      client,
      membership,
      attendance,
    };
  },

  // Asistencias registradas (todas o filtradas por fecha)
  async listAttendances(date?: string): Promise<(AttendanceRecord & { status: string; plan_name?: string })[]> {
    if (date && date.trim() !== '') {
      return query(`
        SELECT 
          a.id, a.client_id, a.check_in_time, a.was_overridden, a.override_reason, a.registered_by,
          c.full_name, c.document_id, c.phone
        FROM attendances a
        JOIN clients c ON a.client_id = c.id
        WHERE substring(a.check_in_time from 1 for 10) = ?
        ORDER BY a.check_in_time DESC
      `, [date.trim()]);
    }
    return query(`
      SELECT 
        a.id, a.client_id, a.check_in_time, a.was_overridden, a.override_reason, a.registered_by,
        c.full_name, c.document_id, c.phone
      FROM attendances a
      JOIN clients c ON a.client_id = c.id
      ORDER BY a.check_in_time DESC
      LIMIT 150
    `);
  },

  // Asistencias registradas hoy
  async getTodayAttendances(): Promise<(AttendanceRecord & { status: string; plan_name?: string })[]> {
    return query(`
      SELECT 
        a.id, a.client_id, a.check_in_time, a.was_overridden, a.override_reason, a.registered_by,
        c.full_name, c.document_id, c.phone
      FROM attendances a
      JOIN clients c ON a.client_id = c.id
      WHERE substring(a.check_in_time from 1 for 10) = to_char(localtimestamp, 'YYYY-MM-DD')
      ORDER BY a.check_in_time DESC
    `);
  },

  // Historial de un cliente
  async getClientHistory(clientId: string): Promise<AttendanceRecord[]> {
    return query<AttendanceRecord>(`
      SELECT * FROM attendances
      WHERE client_id = ?
      ORDER BY check_in_time DESC
    `, [clientId]);
  }
};
