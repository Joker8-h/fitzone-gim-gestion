import { db } from '../db/database.js';
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
  log(action: string, entity: string, entityId?: string, details?: string, performedBy = 'Sistema') {
    try {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO audit_logs (id, action, entity, entity_id, details, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, action, entity, entityId || null, details || null, performedBy);
    } catch (err) {
      console.error('[AUDIT] Error guardando registro de auditoría:', err);
    }
  },

  getRecentLogs(limit = 50): AuditEntry[] {
    // @ts-ignore
    return db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as AuditEntry[];
  }
};
