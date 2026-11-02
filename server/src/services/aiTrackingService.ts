import { GoogleGenerativeAI } from '@google/generative-ai';
import { query, queryOne, run } from '../db/database.js';
import { getTodayString, daysBetween } from './membershipService.js';
import { baileysManager } from './baileysService.js';
import crypto from 'crypto';

export interface TrackingCandidate {
  clientId: string;
  fullName: string;
  phone: string;
  reason: 'INACTIVITY' | 'EXPIRING_MEMBERSHIP';
  daysInfo: number;
  endDate?: string;
  planName?: string;
  suggestedMessage: string;
}

export const aiTrackingService = {
  // Obtener reglas configuradas
  async getRules() {
    return query('SELECT * FROM tracking_rules');
  },

  async updateRule(ruleType: string, data: { thresholdDays?: number; isEnabled?: boolean; messageTemplate?: string }) {
    const current = await queryOne<any>('SELECT * FROM tracking_rules WHERE rule_type = ?', [ruleType]);
    if (!current) throw new Error('Regla no encontrada');

    const threshold = data.thresholdDays !== undefined ? data.thresholdDays : current.threshold_days;
    const enabled = data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : current.is_enabled;
    const template = data.messageTemplate !== undefined ? data.messageTemplate : current.message_template;

    await run(`
      UPDATE tracking_rules
      SET threshold_days = ?, is_enabled = ?, message_template = ?, updated_at = to_char(localtimestamp, 'YYYY-MM-DD HH24:MI:SS')
      WHERE rule_type = ?
    `, [threshold, enabled, template, ruleType]);

    return queryOne('SELECT * FROM tracking_rules WHERE rule_type = ?', [ruleType]);
  },

  // Generar texto con Gemini IA o plantilla de respaldo
  async generateMessageText(candidate: {
    fullName: string;
    reason: 'INACTIVITY' | 'EXPIRING_MEMBERSHIP';
    daysInfo: number;
    endDate?: string;
    planName?: string;
  }): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Si hay API key disponible, usar Gemini
    if (apiKey && apiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        let prompt = '';
        if (candidate.reason === 'INACTIVITY') {
          prompt = `Eres el asistente administrativo de FITZONE en Colombia. Redacta un mensaje de WhatsApp corto (máximo 3 líneas), cordial, profesional y sin emojis para ${candidate.fullName}, quien lleva ${candidate.daysInfo} días sin asistir a entrenar a pesar de tener su membresía activa. Usa un tono respetuoso y motivador invitándolo a retomar su entrenamiento.`;
        } else {
          prompt = `Eres el asistente administrativo de FITZONE en Colombia. Redacta un recordatorio de WhatsApp breve (máximo 3 líneas), cordial, profesional y sin emojis para ${candidate.fullName}. Su membresía (${candidate.planName || 'Plan actual'}) vence en ${candidate.daysInfo} días (el ${candidate.endDate}). Recuérdale renovar oportunamente para mantener activo su acceso.`;
        }

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim() !== '') {
          return text.trim();
        }
      } catch (err) {
        console.warn('[AI] Error llamando a Gemini, usando plantilla predeterminada:', err);
      }
    }

    // Plantilla de respaldo
    const rule = await queryOne<any>('SELECT message_template FROM tracking_rules WHERE rule_type = ?', [candidate.reason]);
    let template = rule?.message_template || '¡Hola {nombre}! Te esperamos en el gimnasio.';
    template = template
      .replace('{nombre}', candidate.fullName)
      .replace('{dias}', candidate.daysInfo.toString())
      .replace('{fecha_vence}', candidate.endDate || '');

    return template;
  },

  // Obtener candidatos de seguimiento para el día
  async getCandidates(): Promise<TrackingCandidate[]> {
    const today = getTodayString();
    const rules = await this.getRules();
    const inactivityRule = rules.find((r) => r.rule_type === 'INACTIVITY');
    const expiringRule = rules.find((r) => r.rule_type === 'EXPIRING_MEMBERSHIP');

    const candidates: TrackingCandidate[] = [];

    // 1. Clientes inactivos (con membresía vigente pero >= N días sin registrar asistencia)
    if (inactivityRule && inactivityRule.is_enabled) {
      const threshold = inactivityRule.threshold_days;
      const activeMembers = await query<any>(`
        SELECT DISTINCT ON (c.id)
          c.id, c.full_name, c.phone, c.registration_date, m.end_date,
          (
            SELECT MAX(check_in_time) 
            FROM attendances a 
            WHERE a.client_id = c.id
          ) as last_attendance
        FROM clients c
        JOIN client_memberships m ON c.id = m.client_id
        WHERE c.status = 'ACTIVO' AND m.end_date >= ?
        ORDER BY c.id, m.end_date DESC
      `, [today]);

      for (const client of activeMembers) {
        let daysInactive = 0;
        if (!client.last_attendance) {
          // Nunca ha asistido: días reales desde su registro en el sistema
          const since = String(client.registration_date || today).split(' ')[0];
          daysInactive = daysBetween(today, since);
        } else {
          const lastDate = client.last_attendance.split(' ')[0];
          daysInactive = daysBetween(today, lastDate);
        }

        if (daysInactive >= threshold) {
          // Verificar si ya se le envió mensaje en los últimos 3 días (RN-012)
          const alreadySent = await queryOne(`
            SELECT id FROM communication_logs
            WHERE client_id = ? AND rule_type = 'INACTIVITY' 
            AND sent_at >= to_char(localtimestamp - interval '3 days', 'YYYY-MM-DD HH24:MI:SS')
          `, [client.id]);

          if (!alreadySent) {
            candidates.push({
              clientId: client.id,
              fullName: client.full_name,
              phone: client.phone,
              reason: 'INACTIVITY',
              daysInfo: daysInactive,
              suggestedMessage: '',
            });
          }
        }
      }
    }

    // 2. Membresías próximas a vencer (0 <= dias <= threshold)
    if (expiringRule && expiringRule.is_enabled) {
      const threshold = expiringRule.threshold_days;
      const expiringMembers = await query<any>(`
        SELECT DISTINCT ON (c.id)
          c.id, c.full_name, c.phone, m.end_date, p.name as plan_name
        FROM client_memberships m
        JOIN clients c ON m.client_id = c.id
        JOIN membership_plans p ON m.plan_id = p.id
        WHERE c.status = 'ACTIVO' AND m.end_date >= ?
        ORDER BY c.id, m.end_date ASC
      `, [today]);

      for (const member of expiringMembers) {
        const remainingDays = daysBetween(member.end_date, today);
        if (remainingDays >= 0 && remainingDays <= threshold) {
          // Verificar si ya se le envió mensaje hoy (una vez por día por cliente)
          const alreadySent = await queryOne(`
            SELECT id FROM communication_logs
            WHERE client_id = ? AND rule_type = 'EXPIRING_MEMBERSHIP' 
            AND substring(sent_at from 1 for 10) = to_char(localtimestamp, 'YYYY-MM-DD')
          `, [member.id]);

          if (!alreadySent) {
            candidates.push({
              clientId: member.id,
              fullName: member.full_name,
              phone: member.phone,
              reason: 'EXPIRING_MEMBERSHIP',
              daysInfo: remainingDays,
              endDate: member.end_date,
              planName: member.plan_name,
              suggestedMessage: '',
            });
          }
        }
      }
    }

    // Generar mensajes para los candidatos encontrados
    for (const cand of candidates) {
      cand.suggestedMessage = await this.generateMessageText(cand);
    }

    return candidates;
  },

  // Enviar mensaje vía WhatsApp Baileys (o registrar simulación IA si el teléfono aún no ha escaneado QR)
  async sendCommunication(clientId: string, ruleType: string, message: string): Promise<boolean> {
    const client = await queryOne<any>('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) throw new Error('Cliente no encontrado');

    const logId = crypto.randomUUID();
    const waStatus = baileysManager.getStatus();

    try {
      if (waStatus.status === 'CONNECTED') {
        await baileysManager.sendMessage(client.phone, message);
        await run(`
          INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
          VALUES (?, ?, ?, ?, 'SENT', 'Enviado por WhatsApp Baileys')
        `, [logId, clientId, ruleType, message]);
      } else {
        await run(`
          INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
          VALUES (?, ?, ?, ?, 'PROCESSED_AI', 'Generado por IA (Pendiente vincular QR para despacho directo)')
        `, [logId, clientId, ruleType, message]);
      }
      return true;
    } catch (err: any) {
      await run(`
        INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
        VALUES (?, ?, ?, ?, 'FAILED', ?)
      `, [logId, clientId, ruleType, message, err?.message || 'Error de envío']);
      throw err;
    }
  },

  // Ejecutar barrido automático completo de todos los candidatos detectados hoy
  async runAutomatedSweep(): Promise<{ processedCount: number; candidates: TrackingCandidate[] }> {
    const candidates = await this.getCandidates();
    let processedCount = 0;
    for (const c of candidates) {
      await this.sendCommunication(c.clientId, c.reason, c.suggestedMessage);
      processedCount++;
    }
    return { processedCount, candidates };
  },

  // Obtener historial de comunicaciones enviadas
  async getLogs() {
    return query(`
      SELECT l.*, c.full_name, c.phone, c.document_id
      FROM communication_logs l
      JOIN clients c ON l.client_id = c.id
      ORDER BY l.sent_at DESC
      LIMIT 100
    `);
  }
};
