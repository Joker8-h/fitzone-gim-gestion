import { query, queryOne, run } from '../db/database.js';
import { getTodayString } from './membershipService.js';
import { badRequest, notFound } from '../errors.js';
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
  async list(search?: string, status?: string): Promise<Client[]> {
    let sql = `
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
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ' AND (c.document_id ILIKE ? OR c.full_name ILIKE ? OR c.phone ILIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY c.created_at DESC';
    const rows = await query<Client>(sql, params);
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

  async getById(id: string): Promise<Client | null> {
    return queryOne<Client>('SELECT * FROM clients WHERE id = ?', [id]);
  },

  async getByDocument(documentId: string): Promise<Client | null> {
    return queryOne<Client>('SELECT * FROM clients WHERE document_id = ?', [documentId.trim()]);
  },

  async create(data: { documentId: string; fullName: string; phone: string; notes?: string }): Promise<Client> {
    const existing = await this.getByDocument(data.documentId);
    if (existing) {
      throw badRequest(`Ya existe un miembro registrado con el documento ${data.documentId} (${existing.full_name})`);
    }

    const id = crypto.randomUUID();
    const now = getTodayString();

    await run(`
      INSERT INTO clients (id, document_id, full_name, phone, registration_date, status, notes)
      VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)
    `, [id, data.documentId.trim(), data.fullName.trim(), data.phone.trim(), now, data.notes?.trim() || null]);

    return (await this.getById(id))!;
  },

  async update(id: string, data: { fullName?: string; phone?: string; notes?: string; status?: string }): Promise<Client> {
    const current = await this.getById(id);
    if (!current) {
      throw notFound('Miembro no encontrado');
    }

    const fullName = data.fullName !== undefined ? data.fullName.trim() : current.full_name;
    const phone = data.phone !== undefined ? data.phone.trim() : current.phone;
    const notes = data.notes !== undefined ? (data.notes.trim() || null) : (current.notes || null);
    const status = data.status !== undefined ? data.status : current.status;

    await run(`
      UPDATE clients
      SET full_name = ?, phone = ?, notes = ?, status = ?, updated_at = to_char(localtimestamp, 'YYYY-MM-DD HH24:MI:SS')
      WHERE id = ?
    `, [fullName, phone, notes, status, id]);

    return (await this.getById(id))!;
  },

  async deactivate(id: string): Promise<Client> {
    return this.update(id, { status: 'INACTIVO' });
  },

  async delete(id: string) {
    await run('DELETE FROM clients WHERE id = ?', [id]);
    return { deleted: true };
  }
};
