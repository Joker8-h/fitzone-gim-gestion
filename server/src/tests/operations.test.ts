/**
 * Tests de operaciones, dashboard y WhatsApp IA (Fase 2 — D1).
 * Verifica que todos los apartados del sistema (Clases, Eventos, Empleados,
 * Equipos, Reportes/Dashboard y WhatsApp IA) funcionen de extremo a extremo.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import { resetTestData } from './setup.js';
import { loginAdmin, createClient, createPlan, assignMembership } from './helpers.js';
import type { Agent } from './helpers.js';

const app = createApp();
let admin: Agent;

describe('operations, dashboard & whatsapp: todos los apartados operativos', () => {
  beforeAll(async () => {
    await resetTestData();
    admin = await loginAdmin(app);
  });

  it('clases: crear, ajustar cupo (+1/-1), listar y eliminar → 200/201', async () => {
    const createRes = await admin.post('/api/operations/classes').send({
      name: 'Spinning Matutino',
      instructorName: 'Carlos Ruiz',
      scheduleTime: '06:00 - 07:00',
      capacity: 20,
      colorTheme: 'emerald',
    });
    expect(createRes.status).toBe(201);
    const classId = createRes.body.id;
    expect(createRes.body.enrolled_count).toBe(0);

    const incRes = await admin.patch(`/api/operations/classes/${classId}/enrollment`).send({ delta: 1 });
    expect(incRes.status).toBe(200);
    expect(incRes.body.enrolled_count).toBe(1);

    const decRes = await admin.patch(`/api/operations/classes/${classId}/enrollment`).send({ delta: -1 });
    expect(decRes.status).toBe(200);
    expect(decRes.body.enrolled_count).toBe(0);

    const listRes = await admin.get('/api/operations/classes');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((c: { id: string }) => c.id === classId)).toBe(true);

    const delRes = await admin.delete(`/api/operations/classes/${classId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('eventos: crear, listar y eliminar → 200/201', async () => {
    const createRes = await admin.post('/api/operations/events').send({
      title: 'Torneo Interno CrossFit',
      dayNum: '28',
      monthShort: 'NOV',
      timeRange: '08:00 AM - 12:00 PM',
    });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body.id;

    const listRes = await admin.get('/api/operations/events');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((e: { id: string }) => e.id === eventId)).toBe(true);

    const delRes = await admin.delete(`/api/operations/events/${eventId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('empleados: crear, cambiar estado ACTIVO/INACTIVO, listar y eliminar → 200/201', async () => {
    const createRes = await admin.post('/api/operations/employees').send({
      fullName: 'Camilo Vargas',
      role: 'Entrenador',
      specialty: 'Musculación',
      phone: '3109876543',
      salary: 1800000,
    });
    expect(createRes.status).toBe(201);
    const empId = createRes.body.id;
    expect(createRes.body.status).toBe('ACTIVO');

    const toggleRes = await admin.patch(`/api/operations/employees/${empId}/toggle`);
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.status).toBe('INACTIVO');

    const listRes = await admin.get('/api/operations/employees');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((e: { id: string }) => e.id === empId)).toBe(true);

    const delRes = await admin.delete(`/api/operations/employees/${empId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('equipos: crear, cambiar estado operativo, listar y eliminar → 200/201', async () => {
    const createRes = await admin.post('/api/operations/equipment').send({
      name: 'Caminadora Pro #1',
      category: 'Cardio',
      status: 'Disponible',
    });
    expect(createRes.status).toBe(201);
    const eqId = createRes.body.id;
    expect(createRes.body.status).toBe('Disponible');

    const statusRes = await admin
      .patch(`/api/operations/equipment/${eqId}/status`)
      .send({ status: 'Mantenimiento' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('Mantenimiento');

    const listRes = await admin.get('/api/operations/equipment');
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((eq: { id: string }) => eq.id === eqId)).toBe(true);

    const delRes = await admin.delete(`/api/operations/equipment/${eqId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(true);
  });

  it('dashboard: devuelve métricas con attendanceLast30Days de 30 puntos y monthlyRevenues', async () => {
    const res = await admin.get('/api/dashboard/metrics');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.attendanceLast30Days)).toBe(true);
    expect(res.body.attendanceLast30Days.length).toBe(30);
    expect(Array.isArray(res.body.monthlyRevenues)).toBe(true);
    expect(res.body.monthlyRevenues.length).toBeGreaterThanOrEqual(1);
  });

  it('whatsapp IA: estado, reglas, actualización de regla, envío individual y barrido → 200', async () => {
    const statusRes = await admin.get('/api/whatsapp/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBeTruthy();

    const rulesRes = await admin.get('/api/whatsapp/rules');
    expect(rulesRes.status).toBe(200);
    expect(rulesRes.body.length).toBe(2);

    const updRule = await admin.put('/api/whatsapp/rules/EXPIRING_MEMBERSHIP').send({
      thresholdDays: 4,
      isEnabled: true,
      messageTemplate: 'Hola {nombre}, tu plan vence el {fecha_vence} (en {dias} días).',
    });
    expect(updRule.status).toBe(200);
    expect(updRule.body.threshold_days).toBe(4);

    // Crear cliente con membresía de 2 días para que sea candidato de EXPIRING_MEMBERSHIP
    const clientId = await createClient(app, admin, { fullName: 'Candidato IA' });
    const shortPlan = await createPlan(app, admin, { name: 'Pase 2 Días', durationDays: 2, price: 25000 });
    await assignMembership(admin, clientId, shortPlan.id, { amountPaid: 25000 });

    const candidatesRes = await admin.get('/api/whatsapp/candidates');
    expect(candidatesRes.status).toBe(200);
    expect(candidatesRes.body.some((c: { clientId: string }) => c.clientId === clientId)).toBe(true);

    // Ejecutar barrido automático
    const sweepRes = await admin.post('/api/whatsapp/run-automated');
    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.processedCount).toBeGreaterThanOrEqual(1);

    // Verificar bitácora de comunicaciones
    const logsRes = await admin.get('/api/whatsapp/logs');
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.some((l: { client_id: string }) => l.client_id === clientId)).toBe(true);
  });
});
