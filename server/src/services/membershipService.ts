import { db } from '../db/database.js';
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

// Helpers para fechas (formato YYYY-MM-DD)
export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
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
  getPlans(onlyActive = true): MembershipPlan[] {
    const sql = onlyActive
      ? 'SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY price ASC'
      : 'SELECT * FROM membership_plans ORDER BY is_active DESC, price ASC';
    // @ts-ignore
    return db.prepare(sql).all() as MembershipPlan[];
  },

  getPlanById(id: string): MembershipPlan | undefined {
    // @ts-ignore
    return db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(id) as MembershipPlan | undefined;
  },

  createPlan(data: { name: string; durationDays: number; price: number; description?: string }): MembershipPlan {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO membership_plans (id, name, duration_days, price, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, data.name.trim(), data.durationDays, data.price, data.description?.trim() || null);
    return this.getPlanById(id)!;
  },

  updatePlan(id: string, data: { name?: string; durationDays?: number; price?: number; description?: string; isActive?: boolean }): MembershipPlan {
    const current = this.getPlanById(id);
    if (!current) throw new Error('Plan no encontrado');

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const durationDays = data.durationDays !== undefined ? data.durationDays : current.duration_days;
    const price = data.price !== undefined ? data.price : current.price;
    const description = data.description !== undefined ? (data.description.trim() || null) : (current.description || null);
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active;

    db.prepare(`
      UPDATE membership_plans
      SET name = ?, duration_days = ?, price = ?, description = ?, is_active = ?
      WHERE id = ?
    `).run(name, durationDays, price, description, isActive, id);

    return this.getPlanById(id)!;
  },

  // Obtiene el estado calculado de la membresía más reciente
  getLatestMembership(clientId: string): (ClientMembership & { daysRemaining: number }) | null {
    // @ts-ignore
    const row = db.prepare(`
      SELECT m.*, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      WHERE m.client_id = ?
      ORDER BY m.end_date DESC, m.created_at DESC
      LIMIT 1
    `).get(clientId) as any;

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

  getClientMemberships(clientId: string): ClientMembership[] {
    const today = getTodayString();
    // @ts-ignore
    const list = db.prepare(`
      SELECT m.*, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      WHERE m.client_id = ?
      ORDER BY m.end_date DESC, m.created_at DESC
    `).all(clientId) as any[];

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
  assignMembership(data: {
    clientId: string;
    planId: string;
    amountPaid: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    registeredBy?: string;
  }): { membership: ClientMembership; payment: PaymentRecord } {
    const plan = this.getPlanById(data.planId);
    if (!plan) throw new Error('Plan seleccionado no existe');

    const today = getTodayString();
    const currentActive = this.getLatestMembership(data.clientId);

    let startDate = today;
    let endDate = addDaysToDate(today, plan.duration_days);

    // Si tiene membresía vigente o por vencer (no vencida), se acumula desde su vencimiento actual
    if (currentActive && currentActive.end_date >= today) {
      startDate = currentActive.start_date; // o la fecha actual si es una extensión continua
      endDate = addDaysToDate(currentActive.end_date, plan.duration_days);
    }

    const membershipId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();

    // Transacción atómica
    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insertar Membresía
      db.prepare(`
        INSERT INTO client_memberships (id, client_id, plan_id, start_date, end_date, status, price_paid)
        VALUES (?, ?, ?, ?, ?, 'VIGENTE', ?)
      `).run(membershipId, data.clientId, plan.id, startDate, endDate, data.amountPaid);

      // 2. Insertar Pago
      db.prepare(`
        INSERT INTO payments (id, client_id, membership_id, amount, payment_method, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        data.clientId,
        membershipId,
        data.amountPaid,
        data.paymentMethod,
        data.reference?.trim() || null,
        data.notes?.trim() || null
      );

      // 3. Crear Movimiento Financiero unificado (RN-006 / DP-006)
      // Categoría 'Membresías'
      // @ts-ignore
      const cat = db.prepare("SELECT id FROM financial_categories WHERE name = 'Membresías'").get() as any;
      const categoryId = cat ? cat.id : null;

      db.prepare(`
        INSERT INTO financial_transactions (id, type, category_id, concept, amount, payment_id, registered_by)
        VALUES (?, 'INGRESO', ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        categoryId,
        `Pago Membresía: ${plan.name}`,
        data.amountPaid,
        paymentId,
        data.registeredBy || 'Admin'
      );

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    // @ts-ignore
    const membership = db.prepare('SELECT * FROM client_memberships WHERE id = ?').get(membershipId) as ClientMembership;
    // @ts-ignore
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as PaymentRecord;

    return { membership, payment };
  },

  getClientPayments(clientId: string): PaymentRecord[] {
    // @ts-ignore
    return db.prepare(`
      SELECT p.*, m.start_date, m.end_date, pl.name as plan_name
      FROM payments p
      LEFT JOIN client_memberships m ON p.membership_id = m.id
      LEFT JOIN membership_plans pl ON m.plan_id = pl.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `).all(clientId) as PaymentRecord[];
  }
};
