import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/database.js';
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
  getRules() {
    // @ts-ignore
    return db.prepare('SELECT * FROM tracking_rules').all() as any[];
  },

  updateRule(ruleType: string, data: { thresholdDays?: number; isEnabled?: boolean; messageTemplate?: string }) {
    // @ts-ignore
    const current = db.prepare('SELECT * FROM tracking_rules WHERE rule_type = ?').get(ruleType) as any;
    if (!current) throw new Error('Regla no encontrada');

    const threshold = data.thresholdDays !== undefined ? data.thresholdDays : current.threshold_days;
    const enabled = data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : current.is_enabled;
    const template = data.messageTemplate !== undefined ? data.messageTemplate : current.message_template;

    db.prepare(`
      UPDATE tracking_rules
      SET threshold_days = ?, is_enabled = ?, message_template = ?, updated_at = datetime('now', 'localtime')
      WHERE rule_type = ?
    `).run(threshold, enabled, template, ruleType);

    // @ts-ignore
    return db.prepare('SELECT * FROM tracking_rules WHERE rule_type = ?').get(ruleType);
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
    // @ts-ignore
    const rule = db.prepare('SELECT message_template FROM tracking_rules WHERE rule_type = ?').get(candidate.reason) as any;
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
    const rules = this.getRules();
    const inactivityRule = rules.find((r) => r.rule_type === 'INACTIVITY');
    const expiringRule = rules.find((r) => r.rule_type === 'EXPIRING_MEMBERSHIP');

    const candidates: TrackingCandidate[] = [];

    // 1. Clientes inactivos (con membresía vigente pero >= N días sin registrar asistencia)
    if (inactivityRule && inactivityRule.is_enabled) {
      const threshold = inactivityRule.threshold_days;
      // @ts-ignore
      const activeMembers = db.prepare(`
        SELECT c.id, c.full_name, c.phone, m.end_date,
          (
            SELECT MAX(check_in_time) 
            FROM attendances a 
            WHERE a.client_id = c.id
          ) as last_attendance
        FROM clients c
        JOIN client_memberships m ON c.id = m.client_id
        WHERE c.status = 'ACTIVO' AND m.end_date >= ?
        GROUP BY c.id
      `).all(today) as any[];

      for (const client of activeMembers) {
        let daysInactive = 0;
        if (!client.last_attendance) {
          daysInactive = 10; // Nunca ha asistido
        } else {
          const lastDate = client.last_attendance.split(' ')[0];
          daysInactive = daysBetween(today, lastDate);
        }

        if (daysInactive >= threshold) {
          // Verificar si ya se le envió mensaje en los últimos 3 días (RN-012)
          // @ts-ignore
          const alreadySent = db.prepare(`
            SELECT id FROM communication_logs
            WHERE client_id = ? AND rule_type = 'INACTIVITY' 
            AND sent_at >= datetime('now', 'localtime', '-3 days')
          `).get(client.id);

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
      // @ts-ignore
      const expiringMembers = db.prepare(`
        SELECT c.id, c.full_name, c.phone, m.end_date, p.name as plan_name
        FROM client_memberships m
        JOIN clients c ON m.client_id = c.id
        JOIN membership_plans p ON m.plan_id = p.id
        WHERE c.status = 'ACTIVO' AND m.end_date >= ?
        ORDER BY m.end_date ASC
      `).all(today) as any[];

      for (const m of expiringMembers) {
        const remainingDays = daysBetween(m.end_date, today);
        if (remainingDays >= 0 && remainingDays <= threshold) {
          // Verificar si ya se le envió mensaje hoy
          // @ts-ignore
          const alreadySent = db.prepare(`
            SELECT id FROM communication_logs
            WHERE client_id = ? AND rule_type = 'EXPIRING_MEMBERSHIP' 
            AND date(sent_at) = date('now', 'localtime')
          `).get(m.id);

          if (!alreadySent) {
            candidates.push({
              clientId: m.id,
              fullName: m.full_name,
              phone: m.phone,
              reason: 'EXPIRING_MEMBERSHIP',
              daysInfo: remainingDays,
              endDate: m.end_date,
              planName: m.plan_name,
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
    // @ts-ignore
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;
    if (!client) throw new Error('Cliente no encontrado');

    const logId = crypto.randomUUID();
    const waStatus = baileysManager.getStatus();

    try {
      if (waStatus.status === 'CONNECTED') {
        await baileysManager.sendMessage(client.phone, message);
        db.prepare(`
          INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
          VALUES (?, ?, ?, ?, 'SENT', 'Enviado por WhatsApp Baileys')
        `).run(logId, clientId, ruleType, message);
      } else {
        db.prepare(`
          INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
          VALUES (?, ?, ?, ?, 'PROCESSED_AI', 'Generado por IA (Pendiente vincular QR para despacho directo)')
        `).run(logId, clientId, ruleType, message);
      }
      return true;
    } catch (err: any) {
      db.prepare(`
        INSERT INTO communication_logs (id, client_id, rule_type, message, status, response_info)
        VALUES (?, ?, ?, ?, 'FAILED', ?)
      `).run(logId, clientId, ruleType, message, err?.message || 'Error de envío');
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
  getLogs() {
    // @ts-ignore
    return db.prepare(`
      SELECT l.*, c.full_name, c.phone, c.document_id
      FROM communication_logs l
      JOIN clients c ON l.client_id = c.id
      ORDER BY l.sent_at DESC
      LIMIT 100
    `).all() as any[];
  }
};
