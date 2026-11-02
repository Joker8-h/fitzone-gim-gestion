import { query, run } from '../db/database.js';
import { logger } from '../logger.js';
import crypto from 'crypto';

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  performed_by?: string;
  created_at: string;
}

export const auditService = {
  // Registro de auditoría: nunca debe romper el flujo principal
  async log(action: string, entity: string, entityId?: string, details?: string, performedBy = 'Sistema'): Promise<void> {
    try {
      const id = crypto.randomUUID();
      await run(`
        INSERT INTO audit_logs (id, action, entity, entity_id, details, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, action, entity, entityId || null, details || null, performedBy]);
    } catch (err: any) {
      logger.error({ err }, '[AUDIT] Error guardando registro de auditoría');
    }
  },

  async getRecentLogs(limit = 50): Promise<AuditEntry[]> {
    return query<AuditEntry>(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit]);
  }
};
