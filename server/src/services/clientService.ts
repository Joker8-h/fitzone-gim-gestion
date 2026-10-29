import { db } from '../db/database.js';
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
}

export const clientService = {
  list(search?: string, status?: string): Client[] {
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ' AND (document_id LIKE ? OR full_name LIKE ? OR phone LIKE ?)';
      params.push(term, term, term);
    }

    query += ' ORDER BY full_name ASC';
    // @ts-ignore
    return db.prepare(query).all(...params) as Client[];
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
      throw new Error(`Ya existe un cliente registrado con el documento ${data.documentId} (${existing.full_name})`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO clients (id, document_id, full_name, phone, registration_date, status, notes)
      VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)
    `).run(id, data.documentId.trim(), data.fullName.trim(), data.phone.trim(), now, data.notes?.trim() || null);

    return this.getById(id)!;
  },

  update(id: string, data: { fullName?: string; phone?: string; notes?: string; status?: string }): Client {
    const current = this.getById(id);
    if (!current) {
      throw new Error('Cliente no encontrado');
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
  }
};
