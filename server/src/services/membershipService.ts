import { query, queryOne, run, withTransaction } from '../db/database.js';
import { notFound, badRequest } from '../errors.js';
import crypto from 'crypto';

export interface MembershipPlan {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description?: string;
  is_active: number;
  created_at: string;
}

export interface ClientMembership {
  id: string;
  client_id: string;
  plan_id: string;
  plan_name?: string;
  start_date: string;
  end_date: string;
  status: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
  price_paid: number;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  client_id: string;
  membership_id?: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

// Helpers para fechas locales (formato YYYY-MM-DD consistente con el resto del sistema)
export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

export function daysBetween(dateStrA: string, dateStrB: string): number {
  const [y1, m1, d1] = dateStrA.split('-').map(Number);
  const [y2, m2, d2] = dateStrB.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffMs = t1 - t2;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const membershipService = {
  async getPlans(onlyActive = true): Promise<MembershipPlan[]> {
    const sql = onlyActive
      ? 'SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY price ASC'
      : 'SELECT * FROM membership_plans ORDER BY is_active DESC, price ASC';
    return query<MembershipPlan>(sql);
  },

  async getPlanById(id: string): Promise<MembershipPlan | null> {
    return queryOne<MembershipPlan>('SELECT * FROM membership_plans WHERE id = ?', [id]);
  },

  async createPlan(data: { name: string; durationDays: number; price: number; description?: string }): Promise<MembershipPlan> {
    const id = crypto.randomUUID();
    await run(`
      INSERT INTO membership_plans (id, name, duration_days, price, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [id, data.name.trim(), data.durationDays, data.price, data.description?.trim() || null]);
    return (await this.getPlanById(id))!;
  },

  async updatePlan(id: string, data: { name?: string; durationDays?: number; price?: number; description?: string; isActive?: boolean }): Promise<MembershipPlan> {
    const current = await this.getPlanById(id);
    if (!current) throw notFound('Plan no encontrado');

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const durationDays = data.durationDays !== undefined ? data.durationDays : current.duration_days;
    const price = data.price !== undefined ? data.price : current.price;
    const description = data.description !== undefined ? (data.description.trim() || null) : (current.description || null);
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active;

    await run(`
      UPDATE membership_plans
      SET name = ?, duration_days = ?, price = ?, description = ?, is_active = ?
      WHERE id = ?
    `, [name, durationDays, price, description, isActive, id]);

    return (await this.getPlanById(id))!;
  },

  async deletePlan(id: string) {
    // Si tiene membresías asociadas, desactivar lógicamente; si no, eliminar físicamente
    const usedRow = await queryOne<{ c: string | number }>('SELECT COUNT(*) as c FROM client_memberships WHERE plan_id = ?', [id]);
    const used = Number(usedRow?.c || 0);
    if (used > 0) {
      await run('UPDATE membership_plans SET is_active = 0 WHERE id = ?', [id]);
    } else {
      await run('DELETE FROM membership_plans WHERE id = ?', [id]);
    }
    return { deleted: true };
  },

  // Obtiene el estado calculado de la membresía más reciente
  async getLatestMembership(clientId: string): Promise<(ClientMembership & { daysRemaining: number }) | null> {
    const row = await queryOne<any>(`
      SELECT m.*, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      WHERE m.client_id = ?
      ORDER BY m.end_date DESC, m.created_at DESC
      LIMIT 1
    `, [clientId]);

    if (!row) return null;

    const today = getTodayString();
    const diff = daysBetween(row.end_date, today);

    let status: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' = 'VIGENTE';
    if (diff < 0) {
      status = 'VENCIDA';
    } else if (diff <= 3) {
      status = 'POR_VENCER';
    } else {
      status = 'VIGENTE';
    }

    return {
      ...row,
      status,
      daysRemaining: diff,
    };
  },

  async getClientMemberships(clientId: string): Promise<ClientMembership[]> {
    const today = getTodayString();
    const list = await query<any>(`
      SELECT m.*, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      WHERE m.client_id = ?
      ORDER BY m.end_date DESC, m.created_at DESC
    `, [clientId]);

    return list.map((item) => {
      const diff = daysBetween(item.end_date, today);
      let status: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' = 'VIGENTE';
      if (diff < 0) {
        status = 'VENCIDA';
      } else if (diff <= 3) {
        status = 'POR_VENCER';
      } else {
        status = 'VIGENTE';
      }
      return { ...item, status };
    });
  },

  // Registrar pago y asignar membresía
  // REGLA CLAVE DP-002: Si la membresía actual está vigente, suma días al final del vencimiento actual.
  async assignMembership(data: {
    clientId: string;
    planId: string;
    amountPaid: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    registeredBy?: string;
  }): Promise<{ membership: ClientMembership; payment: PaymentRecord }> {
    const plan = await this.getPlanById(data.planId);
    if (!plan) throw notFound('Plan seleccionado no existe');

    const today = getTodayString();
    const currentActive = await this.getLatestMembership(data.clientId);

    let startDate = today;
    let endDate = addDaysToDate(today, plan.duration_days);

    // Si tiene membresía vigente o por vencer (no vencida), se acumula desde su vencimiento actual
    if (currentActive && currentActive.end_date >= today) {
      startDate = currentActive.start_date; // o la fecha actual si es una extensión continua
      endDate = addDaysToDate(currentActive.end_date, plan.duration_days);
    }

    const membershipId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();

    // Transacción atómica (membresía + pago + movimiento financiero) con ROLLBACK automático
    await withTransaction(async (tx) => {
      // 1. Insertar Membresía
      await tx.query(`
        INSERT INTO client_memberships (id, client_id, plan_id, start_date, end_date, status, price_paid)
        VALUES ($1, $2, $3, $4, $5, 'VIGENTE', $6)
      `, [membershipId, data.clientId, plan.id, startDate, endDate, data.amountPaid]);

      // 2. Insertar Pago
      await tx.query(`
        INSERT INTO payments (id, client_id, membership_id, amount, payment_method, reference, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        paymentId,
        data.clientId,
        membershipId,
        data.amountPaid,
        data.paymentMethod,
        data.reference?.trim() || null,
        data.notes?.trim() || null
      ]);

      // 3. Crear Movimiento Financiero unificado (RN-006 / DP-006)
      // Categoría 'Membresías'
      const cat = await tx.query("SELECT id FROM financial_categories WHERE name = 'Membresías'");
      const categoryId = cat.rows[0] ? cat.rows[0].id : null;

      await tx.query(`
        INSERT INTO financial_transactions (id, type, category_id, concept, amount, payment_id, registered_by)
        VALUES ($1, 'INGRESO', $2, $3, $4, $5, $6)
      `, [
        crypto.randomUUID(),
        categoryId,
        `Pago Membresía: ${plan.name}`,
        data.amountPaid,
        paymentId,
        data.registeredBy || 'Admin'
      ]);
    });

    const membership = (await queryOne<ClientMembership>('SELECT * FROM client_memberships WHERE id = ?', [membershipId]))!;
    const payment = (await queryOne<PaymentRecord>('SELECT * FROM payments WHERE id = ?', [paymentId]))!;

    return { membership, payment };
  },

  async getClientPayments(clientId: string): Promise<PaymentRecord[]> {
    return query<PaymentRecord>(`
      SELECT p.*, m.start_date, m.end_date, pl.name as plan_name
      FROM payments p
      LEFT JOIN client_memberships m ON p.membership_id = m.id
      LEFT JOIN membership_plans pl ON m.plan_id = pl.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, [clientId]);
  }
};
