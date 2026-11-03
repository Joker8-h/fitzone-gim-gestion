/**
 * Tests de membresías (Fase 2 — D1). Caso de negocio clave: DP-002
 * (la renovación SUMA días exactamente al vencimiento previo).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import { resetTestData } from './setup.js';
import { loginAdmin, createClient, createPlan, assignMembership } from './helpers.js';
import type { Agent } from './helpers.js';

const app = createApp();
let admin: Agent;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('memberships: planes, asignación y DP-002', () => {
  beforeAll(async () => {
    await resetTestData();
    admin = await loginAdmin(app);
  });

  it('crear plan válido → 201 con números', async () => {
    const plan = await createPlan(app, admin, { name: 'Plan DP002', durationDays: 30, price: 150000 });
    expect(plan.id).toBeTruthy();
    expect(plan.price).toBe(150000);
  });

  it('crear plan con duración 0 → 400 en español', async () => {
    const res = await admin.post('/api/memberships/plans').send({
      name: 'Inválido',
      durationDays: 0,
      price: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('durationDays');
    expect(res.body.error).toContain('mayor a 0');
  });

  it('crear plan sin nombre → 400', async () => {
    const res = await admin.post('/api/memberships/plans').send({ durationDays: 30, price: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('name');
  });

  it('crear plan con precio negativo → 400', async () => {
    const res = await admin.post('/api/memberships/plans').send({
      name: 'Negativo',
      durationDays: 30,
      price: -5000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('price');
  });

  it('asignar membresía nueva → 201 con vencimiento = hoy + duración (DP-002)', async () => {
    const clientId = await createClient(app, admin);
    const plan = await createPlan(app, admin, { durationDays: 30, price: 120000 });

    const res = await assignMembership(admin, clientId, plan.id, {
      amountPaid: 120000,
      paymentMethod: 'EFECTIVO',
    });
    expect(res.status).toBe(201);
    expect(res.body.membership).toBeTruthy();

    const end = String(res.body.membership.end_date);
    const today = new Date().toISOString().slice(0, 10);
    expect(end).toBe(addDays(today, 30));
  });

  it('DP-002: la renovación SUMA 30 días al vencimiento previo (no a hoy)', async () => {
    const clientId = await createClient(app, admin);
    const plan = await createPlan(app, admin, { durationDays: 30, price: 120000 });

    const first = await assignMembership(admin, clientId, plan.id, { amountPaid: 120000 });
    expect(first.status).toBe(201);
    const firstEnd = String(first.body.membership.end_date);

    const second = await assignMembership(admin, clientId, plan.id, { amountPaid: 120000 });
    expect(second.status).toBe(201);
    const secondEnd = String(second.body.membership.end_date);

    expect(secondEnd).toBe(addDays(firstEnd, 30));
  });

  it('asignar membresía sin cliente → 400', async () => {
    const res = await admin.post('/api/memberships/assign').send({ planId: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cliente');
  });

  it('asignar membresía con método de pago inválido → 400', async () => {
    const clientId = await createClient(app, admin);
    const plan = await createPlan(app, admin);
    const res = await assignMembership(admin, clientId, plan.id, {
      paymentMethod: 'BITCOIN',
      amountPaid: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Método de pago');
  });

  it('asignar membresía a plan inexistente → 404', async () => {
    const clientId = await createClient(app, admin);
    const res = await assignMembership(admin, clientId, '99999999-9999-4999-8999-999999999999', {
      amountPaid: 1000,
    });
    expect(res.status).toBe(404);
  });

  it('sin monto explícito se usa el precio del plan', async () => {
    const clientId = await createClient(app, admin);
    const plan = await createPlan(app, admin, { price: 80000 });
    const res = await assignMembership(admin, clientId, plan.id, { paymentMethod: 'NEQUI' });
    expect(res.status).toBe(201);
  });

  it('listar planes → 200', async () => {
    const res = await admin.get('/api/memberships/plans');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('eliminar plan como ADMIN → 200', async () => {
    const plan = await createPlan(app, admin, { name: 'Para Borrar' });
    const res = await admin.delete(`/api/memberships/plans/${plan.id}`);
    expect(res.status).toBe(200);
  });
});
