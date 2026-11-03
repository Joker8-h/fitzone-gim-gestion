/**
 * Tests de finanzas (Fase 2 — D1).
 * Cubre: resumen, movimientos, validación Zod, eliminación solo ADMIN,
 * pago a entrenador y balance (CA-004).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import { resetTestData } from './setup.js';
import { loginAdmin, createPlan, createUser, loginAs } from './helpers.js';
import type { Agent } from './helpers.js';

const app = createApp();
let admin: Agent;

async function getCategory(agent: Agent, type: 'INGRESO' | 'EGRESO'): Promise<string> {
  const res = await agent.get(`/api/finances/categories?type=${type}`);
  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThan(0);
  return res.body[0].id;
}

describe('finances: movimientos y resumen', () => {
  beforeAll(async () => {
    await resetTestData();
    admin = await loginAdmin(app);
  });

  it('listar categorías filtradas por tipo → 200', async () => {
    const ingresos = await admin.get('/api/finances/categories?type=INGRESO');
    expect(ingresos.status).toBe(200);
    expect(ingresos.body.every((c: { type: string }) => c.type === 'INGRESO')).toBe(true);
  });

  it('listar categorías con tipo inválido → 400 (Zod)', async () => {
    const res = await admin.get('/api/finances/categories?type=CRYPTO');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('type');
  });

  it('crear ingreso manual → 201 y suma en el resumen', async () => {
    const categoryId = await getCategory(admin, 'INGRESO');
    const before = await admin.get('/api/finances/summary');
    const beforeTotal = Number(before.body.totalIncomes);

    const tx = await admin.post('/api/finances/transactions').send({
      type: 'INGRESO',
      categoryId,
      concept: 'Venta de suplementos',
      amount: 50000,
    });
    expect(tx.status).toBe(201);

    const after = await admin.get('/api/finances/summary');
    expect(Number(after.body.totalIncomes)).toBe(beforeTotal + 50000);
  });

  it('crear movimiento con monto 0 → 400 (Zod)', async () => {
    const categoryId = await getCategory(admin, 'INGRESO');
    const res = await admin.post('/api/finances/transactions').send({
      type: 'INGRESO',
      categoryId,
      concept: 'Monto cero',
      amount: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('amount');
    expect(res.body.error).toContain('superior a 0');
  });

  it('crear movimiento sin concepto → 400 (Zod)', async () => {
    const categoryId = await getCategory(admin, 'INGRESO');
    const res = await admin.post('/api/finances/transactions').send({
      type: 'INGRESO',
      categoryId,
      amount: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('concept');
  });

  it('pago a entrenador → 201 y refleja como EGRESO (CA-004)', async () => {
    const before = await admin.get('/api/finances/summary');
    const beforeExpenses = Number(before.body.totalExpenses);

    const res = await admin.post('/api/finances/coach-payment').send({
      coachName: 'Entrenador Test',
      amount: 75000,
      periodConcept: 'Noviembre 2026',
    });
    expect(res.status).toBe(201);

    const after = await admin.get('/api/finances/summary');
    expect(Number(after.body.totalExpenses)).toBe(beforeExpenses + 75000);
    // Balance neto = ingresos - egresos
    expect(Number(after.body.netResult)).toBe(
      Number(after.body.totalIncomes) - Number(after.body.totalExpenses)
    );
  });

  it('pago a entrenador sin monto → 400 (Zod)', async () => {
    const res = await admin.post('/api/finances/coach-payment').send({
      coachName: 'Sin Monto',
      periodConcept: 'x',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('amount');
  });

  it('listar movimientos → 200', async () => {
    const res = await admin.get('/api/finances/transactions');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('eliminar movimiento solo ADMIN → 200; RECEPCION → 403', async () => {
    const categoryId = await getCategory(admin, 'INGRESO');
    const tx = await admin.post('/api/finances/transactions').send({
      type: 'INGRESO',
      categoryId,
      concept: 'Para borrar',
      amount: 1000,
    });
    expect(tx.status).toBe(201);

    const recepcion = await createUser(app, 'RECEPCION');
    const agent = await loginAs(app, recepcion.username, recepcion.password);
    const forbidden = await agent.delete(`/api/finances/transactions/${tx.body.id}`);
    expect(forbidden.status).toBe(403);

    const del = await admin.delete(`/api/finances/transactions/${tx.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
  });

  it('resumen con rango de fechas inválido → 400 (Zod)', async () => {
    const res = await admin.get('/api/finances/summary?startDate=no-es-fecha');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('startDate');
  });

  it('membresía asignada genera ingreso en finanzas sin duplicar (CA-004)', async () => {
    const clientId = (await admin.post('/api/clients').send({
      documentId: `600${Date.now().toString().slice(-7)}`,
      fullName: 'Finanza Membresía',
      phone: '3005550001',
    })).body.id;

    const plan = await createPlan(app, admin, { price: 90000 });
    const before = await admin.get('/api/finances/summary');
    const beforeTotal = Number(before.body.totalIncomes);

    const assign = await admin.post('/api/memberships/assign').send({
      clientId,
      planId: plan.id,
      amountPaid: 90000,
      paymentMethod: 'EFECTIVO',
    });
    expect(assign.status).toBe(201);

    const after = await admin.get('/api/finances/summary');
    expect(Number(after.body.totalIncomes)).toBe(beforeTotal + 90000);
  });
});
