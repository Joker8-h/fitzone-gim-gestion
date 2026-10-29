import { db } from '../db/database.js';
import crypto from 'crypto';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'INGRESO' | 'EGRESO';
  is_system: number;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  category_id?: string;
  category_name?: string;
  concept: string;
  amount: number;
  date: string;
  payment_id?: string;
  registered_by?: string;
  created_at: string;
}

export interface FinanceSummary {
  totalIncomes: number;
  totalExpenses: number;
  netResult: number;
  transactionsCount: number;
}

export const financeService = {
  getCategories(type?: 'INGRESO' | 'EGRESO'): FinancialCategory[] {
    let sql = 'SELECT * FROM financial_categories';
    const params: any[] = [];
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY is_system DESC, name ASC';
    // @ts-ignore
    return db.prepare(sql).all(...params) as FinancialCategory[];
  },

  createCategory(name: string, type: 'INGRESO' | 'EGRESO'): FinancialCategory {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO financial_categories (id, name, type, is_system)
      VALUES (?, ?, ?, 0)
    `).run(id, name.trim(), type);
    // @ts-ignore
    return db.prepare('SELECT * FROM financial_categories WHERE id = ?').get(id) as FinancialCategory;
  },

  createTransaction(data: {
    type: 'INGRESO' | 'EGRESO';
    categoryId?: string;
    concept: string;
    amount: number;
    date?: string;
    registeredBy?: string;
  }): FinancialTransaction {
    if (data.amount <= 0) {
      throw new Error('El monto debe ser superior a 0');
    }

    const id = crypto.randomUUID();
    const date = data.date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO financial_transactions (id, type, category_id, concept, amount, date, registered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.type,
      data.categoryId || null,
      data.concept.trim(),
      data.amount,
      date,
      data.registeredBy || 'Admin'
    );

    // @ts-ignore
    return db.prepare(`
      SELECT t.*, c.name as category_name
      FROM financial_transactions t
      LEFT JOIN financial_categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id) as FinancialTransaction;
  },

  // Registrar egreso específico para Pago a Entrenador (RF-025)
  recordCoachPayment(data: {
    coachName: string;
    amount: number;
    periodConcept: string;
    date?: string;
    registeredBy?: string;
  }): FinancialTransaction {
    // @ts-ignore
    const coachCategory = db.prepare("SELECT id FROM financial_categories WHERE name = 'Pago a Entrenadores'").get() as any;
    const categoryId = coachCategory ? coachCategory.id : null;

    return this.createTransaction({
      type: 'EGRESO',
      categoryId,
      concept: `Pago a Entrenador (${data.coachName}) - ${data.periodConcept}`,
      amount: data.amount,
      date: data.date,
      registeredBy: data.registeredBy,
    });
  },

  // Listado de transacciones con filtros (RF-027)
  listTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'INGRESO' | 'EGRESO';
    categoryId?: string;
  }): FinancialTransaction[] {
    let query = `
      SELECT t.*, c.name as category_name
      FROM financial_transactions t
      LEFT JOIN financial_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.startDate) {
      query += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters?.type) {
      query += ' AND t.type = ?';
      params.push(filters.type);
    }
    if (filters?.categoryId) {
      query += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';
    // @ts-ignore
    return db.prepare(query).all(...params) as FinancialTransaction[];
  },

  // Resumen financiero (RF-026 / RN-007)
  getSummary(startDate?: string, endDate?: string): FinanceSummary {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }

    // @ts-ignore
    const incRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      ${whereClause} AND type = 'INGRESO'
    `).get(...params) as any;

    // @ts-ignore
    const expRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      ${whereClause} AND type = 'EGRESO'
    `).get(...params) as any;

    // @ts-ignore
    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM financial_transactions
      ${whereClause}
    `).get(...params) as any;

    const totalIncomes = incRow?.total || 0;
    const totalExpenses = expRow?.total || 0;
    const netResult = totalIncomes - totalExpenses;

    return {
      totalIncomes,
      totalExpenses,
      netResult,
      transactionsCount: countRow?.count || 0,
    };
  }
};
