/**
 * Tests de rutas de clientes (Fase 2 — D1).
 * Cubre: CRUD, validación Zod (400), duplicados, 404, auditoría.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../app.js';
import { resetTestData } from './setup.js';
import { loginAdmin, createClient } from './helpers.js';
import type { Agent } from './helpers.js';

const app = createApp();
let admin: Agent;

describe('clients: CRUD y validación', () => {
  beforeAll(async () => {
    await resetTestData();
    admin = await loginAdmin(app);
  });

  it('crear cliente válido → 201 con datos normalizados', async () => {
    const res = await admin.post('/api/clients').send({
      documentId: '  1234567890  ',
      fullName: '  María Pérez  ',
      phone: '+57 300 123 4567',
    });
    expect(res.status).toBe(201);
    expect(res.body.document_id).toBe('1234567890');
    expect(res.body.full_name).toBe('María Pérez');
    expect(res.body.status).toBe('ACTIVO');
  });

  it('crear cliente sin documento → 400 con mensaje en español', async () => {
    const res = await admin.post('/api/clients').send({ fullName: 'Sin Doc', phone: '3001234567' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('documentId');
    expect(res.body.error).toContain('documento');
    expect(res.body.details).toBeTruthy();
  });

  it('crear cliente con teléfono de 3 dígitos → 400', async () => {
    const res = await admin.post('/api/clients').send({
      documentId: '9998887776',
      fullName: 'Tel Corto',
      phone: '300',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('7 dígitos');
  });

  it('crear cliente duplicado → 400 con el nombre del existente', async () => {
    const doc = `800${Date.now().toString().slice(-7)}`;
    const first = await admin.post('/api/clients').send({
      documentId: doc,
      fullName: 'Original',
      phone: '3001112233',
    });
    expect(first.status).toBe(201);

    const dup = await admin.post('/api/clients').send({
      documentId: doc,
      fullName: 'Duplicado',
      phone: '3001112233',
    });
    expect(dup.status).toBe(400);
    expect(dup.body.error).toContain('Ya existe');
    expect(dup.body.error).toContain('Original');
  });

  it('listar y buscar clientes → 200', async () => {
    await createClient(app, admin, { fullName: 'Buscar Me' });
    const list = await admin.get('/api/clients');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const found = await admin.get('/api/clients?search=Buscar Me');
    expect(found.status).toBe(200);
    expect(found.body.length).toBeGreaterThanOrEqual(1);
  });

  it('detalle de cliente inexistente → 404', async () => {
    const res = await admin.get('/api/clients/99999999-9999-4999-8999-999999999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrado');
  });

  it('actualizar cliente → 200 con cambios aplicados', async () => {
    const id = await createClient(app, admin, { fullName: 'Para Editar' });
    const res = await admin.put(`/api/clients/${id}`).send({ fullName: 'Editado OK' });
    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Editado OK');
  });

  it('desactivar cliente → 200 con status INACTIVO', async () => {
    const id = await createClient(app, admin, { fullName: 'Para Inactivar' });
    const res = await admin.patch(`/api/clients/${id}/deactivate`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INACTIVO');
  });

  it('eliminar cliente → 200 y ya no aparece en el listado', async () => {
    const id = await createClient(app, admin, { fullName: 'Para Borrar' });
    const del = await admin.delete(`/api/clients/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);

    const detail = await admin.get(`/api/clients/${id}`);
    expect(detail.status).toBe(404);
  });

  it('body JSON malformado → 400 sin exponer el stack', async () => {
    const res = await admin
      .post('/api/clients')
      .set('Content-Type', 'application/json')
      .send('{"fullName":');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('JSON');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
  });

  it('crear cliente deja registro en la bitácora de auditoría', async () => {
    await createClient(app, admin, { fullName: 'Con Auditoría' });
    const logs = await admin.get('/api/dashboard/audit-logs');
    expect(logs.status).toBe(200);
    const actions = logs.body.map((l: { action: string }) => l.action);
    expect(actions).toContain('CREATE_CLIENT');
  });
});
