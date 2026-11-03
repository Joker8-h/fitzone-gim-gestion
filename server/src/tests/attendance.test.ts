/**
 * Tests de asistencia (Fase 2 — D1). Caso de negocio clave: DP-003
 * (bloqueo estricto de entrada ante cliente sin membresía o vencida,
 * y desbloqueo con excepción manual autorizada).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { createApp } from '../app.js';
import { resetTestData } from './setup.js';
import { loginAdmin, createClient, createPlan, assignMembership } from './helpers.js';
import { run } from '../db/database.js';
import type { Agent } from './helpers.js';

const app = createApp();
let admin: Agent;

/** Inserta una membresía ya vencida (hace 10 días) para probar DP-003. */
async function insertExpiredMembership(clientId: string, planId: string): Promise<void> {
  const past = (days: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  await run(
    `INSERT INTO client_memberships (id, client_id, plan_id, start_date, end_date, status, price_paid)
     VALUES (?, ?, ?, ?, ?, 'VENCIDA', 100000)`,
    [crypto.randomUUID(), clientId, planId, past(40), past(10)]
  );
}

describe('attendance: check-in y DP-003', () => {
  beforeAll(async () => {
    await resetTestData();
    admin = await loginAdmin(app);
  });

  it('check-in de cliente SIN membresía → 403 bloqueado (DP-003)', async () => {
    const doc = `700${Date.now().toString().slice(-7)}`;
    await admin.post('/api/clients').send({
      documentId: doc,
      fullName: 'Sin Membresía',
      phone: '3001230001',
    });

    const res = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(res.status).toBe(403);
    expect(res.body.blocked).toBe(true);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ninguna membresía');
  });

  it('check-in de cliente con membresía VIGENTE → 200 exitoso', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Con Membresía' });
    const plan = await createPlan(app, admin, { durationDays: 30 });
    await assignMembership(admin, clientId, plan.id, { amountPaid: 100000 });

    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;

    const res = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Bienvenido');
  });

  it('check-in de cliente con membresía VENCIDA → 403 (DP-003)', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Vencido' });
    const plan = await createPlan(app, admin);
    await insertExpiredMembership(clientId, plan.id);

    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;

    const res = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(res.status).toBe(403);
    expect(res.body.blocked).toBe(true);
    expect(res.body.message).toContain('ACCESO DENEGADO');
    expect(res.body.message).toContain('venció');
  });

  it('DP-003: desbloqueo con excepción manual (override) → 200 y queda registrado', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Con Excepción' });
    const plan = await createPlan(app, admin);
    await insertExpiredMembership(clientId, plan.id);

    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;

    const res = await admin.post('/api/attendance/check-in').send({
      documentId: doc,
      override: true,
      overrideReason: 'Autorizado por el gerente',
      registeredBy: 'Admin Test',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('autorizado manualmente');

    // Queda rastro en la asistencia y en la auditoría
    const today = await admin.get('/api/attendance/today');
    const row = today.body.find((a: { client_id: string }) => a.client_id === clientId);
    expect(row).toBeTruthy();
    expect(Number(row.was_overridden)).toBe(1);
    expect(row.override_reason).toContain('gerente');

    const logs = await admin.get('/api/dashboard/audit-logs');
    const actions = logs.body.map((l: { action: string }) => l.action);
    expect(actions).toContain('OVERRIDE_CHECKIN');
  });

  it('check-in de cliente INACTIVO → 403', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Inactivo Check' });
    await admin.patch(`/api/clients/${clientId}/deactivate`);
    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;

    const res = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('INACTIVO');
  });

  it('doble check-in en 15 minutos → 409 con aviso (no bloqueo)', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Doble Marcaje' });
    const plan = await createPlan(app, admin);
    await assignMembership(admin, clientId, plan.id, { amountPaid: 100000 });
    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;

    const first = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(first.status).toBe(200);

    const second = await admin.post('/api/attendance/check-in').send({ documentId: doc });
    expect(second.status).toBe(409);
    expect(second.body.blocked).toBe(false);
    expect(second.body.message).toContain('recientemente');
  });

  it('check-in sin documento ni cliente → 400', async () => {
    const res = await admin.post('/api/attendance/check-in').send({ override: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('documento');
  });

  it('check-in de documento inexistente → 403 con mensaje claro', async () => {
    const res = await admin.post('/api/attendance/check-in').send({ documentId: '0000000000' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('No se encontró');
  });

  it('historial de asistencias de un cliente → 200', async () => {
    const clientId = await createClient(app, admin, { fullName: 'Con Historial' });
    const plan = await createPlan(app, admin);
    await assignMembership(admin, clientId, plan.id, { amountPaid: 100000 });
    const client = await admin.get(`/api/clients/${clientId}`);
    const doc = client.body.client.document_id;
    await admin.post('/api/attendance/check-in').send({ documentId: doc });

    const res = await admin.get(`/api/attendance/history/${clientId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
