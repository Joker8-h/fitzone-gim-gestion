import { db } from '../db/database.js';
import { getTodayString } from './membershipService.js';
import crypto from 'crypto';

export interface Client {
  id: string;
  document_id: string;
  full_name: string;
  phone: string;
  registration_date: string;
  status: 'ACTIVO' | 'INACTIVO';
  notes?: string;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  membership_end_date?: string;
  membership_status?: string;
  last_access?: string;
}

export const clientService = {
  list(search?: string, status?: string): Client[] {
    let query = `
      SELECT 
        c.*,
        (
          SELECT p.name 
          FROM client_memberships m 
          JOIN membership_plans p ON m.plan_id = p.id 
          WHERE m.client_id = c.id 
          ORDER BY m.end_date DESC LIMIT 1
        ) as plan_name,
        (
          SELECT m.end_date 
          FROM client_memberships m 
          WHERE m.client_id = c.id 
          ORDER BY m.end_date DESC LIMIT 1
        ) as membership_end_date,
        (
          SELECT MAX(a.check_in_time) 
          FROM attendances a 
          WHERE a.client_id = c.id
        ) as last_access
      FROM clients c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ' AND (c.document_id LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)';
      params.push(term, term, term);
    }

    query += ' ORDER BY c.created_at DESC';
    // @ts-ignore
    const rows = db.prepare(query).all(...params) as Client[];
    const today = getTodayString();

    return rows.map(r => {
      let membership_status = 'SIN_MEMBRESIA';
      if (r.membership_end_date) {
        if (r.membership_end_date < today) {
          membership_status = 'VENCIDA';
        } else {
          const diff = Math.round((new Date(r.membership_end_date).getTime() - new Date(today).getTime()) / 86400000);
          membership_status = diff <= 3 ? 'POR_VENCER' : 'VIGENTE';
        }
      }
      return {
        ...r,
        membership_status,
      };
    });
  },

  getById(id: string): Client | undefined {
    // @ts-ignore
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
  },

  getByDocument(documentId: string): Client | undefined {
    // @ts-ignore
    return db.prepare('SELECT * FROM clients WHERE document_id = ?').get(documentId.trim()) as Client | undefined;
  },

  create(data: { documentId: string; fullName: string; phone: string; notes?: string }): Client {
    const existing = this.getByDocument(data.documentId);
    if (existing) {
      throw new Error(`Ya existe un miembro registrado con el documento ${data.documentId} (${existing.full_name})`);
    }

    const id = crypto.randomUUID();
    const now = getTodayString();

    db.prepare(`
      INSERT INTO clients (id, document_id, full_name, phone, registration_date, status, notes)
      VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)
    `).run(id, data.documentId.trim(), data.fullName.trim(), data.phone.trim(), now, data.notes?.trim() || null);

    return this.getById(id)!;
  },

  update(id: string, data: { fullName?: string; phone?: string; notes?: string; status?: string }): Client {
    const current = this.getById(id);
    if (!current) {
      throw new Error('Miembro no encontrado');
    }

    const fullName = data.fullName !== undefined ? data.fullName.trim() : current.full_name;
    const phone = data.phone !== undefined ? data.phone.trim() : current.phone;
    const notes = data.notes !== undefined ? (data.notes.trim() || null) : (current.notes || null);
    const status = data.status !== undefined ? data.status : current.status;

    db.prepare(`
      UPDATE clients
      SET full_name = ?, phone = ?, notes = ?, status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(fullName, phone, notes, status, id);

    return this.getById(id)!;
  },

  deactivate(id: string): Client {
    return this.update(id, { status: 'INACTIVO' });
  },

  delete(id: string) {
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    return { deleted: true };
  }
};
