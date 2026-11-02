import { query, queryOne, run } from '../db/database.js';
import { getTodayString } from './membershipService.js';
import { badRequest } from '../errors.js';
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
  async getCategories(type?: 'INGRESO' | 'EGRESO'): Promise<FinancialCategory[]> {
    let sql = 'SELECT * FROM financial_categories';
    const params: any[] = [];
    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    sql += ' ORDER BY is_system DESC, name ASC';
    return query<FinancialCategory>(sql, params);
  },

  async createCategory(name: string, type: 'INGRESO' | 'EGRESO'): Promise<FinancialCategory> {
    const id = crypto.randomUUID();
    await run(`
      INSERT INTO financial_categories (id, name, type, is_system)
      VALUES (?, ?, ?, 0)
    `, [id, name.trim(), type]);
    return (await queryOne<FinancialCategory>('SELECT * FROM financial_categories WHERE id = ?', [id]))!;
  },

  async createTransaction(data: {
    type: 'INGRESO' | 'EGRESO';
    categoryId?: string;
    concept: string;
    amount: number;
    date?: string;
    registeredBy?: string;
  }): Promise<FinancialTransaction> {
    if (data.amount <= 0) {
      throw badRequest('El monto debe ser superior a 0');
    }

    const id = crypto.randomUUID();
    const date = data.date || getTodayString();

    await run(`
      INSERT INTO financial_transactions (id, type, category_id, concept, amount, date, registered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.type,
      data.categoryId || null,
      data.concept.trim(),
      data.amount,
      date,
      data.registeredBy || 'Admin'
    ]);

    return (await queryOne<FinancialTransaction>(`
      SELECT t.*, c.name as category_name
      FROM financial_transactions t
      LEFT JOIN financial_categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [id]))!;
  },

  // Registrar egreso específico para Pago a Entrenador (RF-025)
  async recordCoachPayment(data: {
    coachName: string;
    amount: number;
    periodConcept: string;
    date?: string;
    registeredBy?: string;
  }): Promise<FinancialTransaction> {
    const coachCategory = await queryOne<any>("SELECT id FROM financial_categories WHERE name = 'Pago a Entrenadores'");
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
  async listTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'INGRESO' | 'EGRESO';
    categoryId?: string;
  }): Promise<FinancialTransaction[]> {
    let sql = `
      SELECT t.*, c.name as category_name
      FROM financial_transactions t
      LEFT JOIN financial_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.startDate) {
      sql += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      sql += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters?.type) {
      sql += ' AND t.type = ?';
      params.push(filters.type);
    }
    if (filters?.categoryId) {
      sql += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    return query<FinancialTransaction>(sql, params);
  },

  async deleteTransaction(id: string) {
    await run('DELETE FROM financial_transactions WHERE id = ?', [id]);
    return { deleted: true };
  },

  // Resumen financiero (RF-026 / RN-007)
  async getSummary(startDate?: string, endDate?: string): Promise<FinanceSummary> {
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

    const incRow = await queryOne<any>(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      ${whereClause} AND type = 'INGRESO'
    `, params);

    const expRow = await queryOne<any>(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM financial_transactions
      ${whereClause} AND type = 'EGRESO'
    `, params);

    const countRow = await queryOne<any>(`
      SELECT COUNT(*) as count
      FROM financial_transactions
      ${whereClause}
    `, params);

    const totalIncomes = Number(incRow?.total || 0);
    const totalExpenses = Number(expRow?.total || 0);
    const netResult = totalIncomes - totalExpenses;

    return {
      totalIncomes,
      totalExpenses,
      netResult,
      transactionsCount: Number(countRow?.count || 0),
    };
  }
};
