/**
 * Tests de autenticación y autorización (Fase 2 — D1).
 * Cubre: 401 sin sesión, 403 por rol, cookies HttpOnly, gestión de usuarios.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestData, TEST_ADMIN } from './setup.js';
import { loginAdmin, createUser, loginAs } from './helpers.js';

const app = createApp();

describe('auth: sesión y roles', () => {
  beforeAll(async () => {
    await resetTestData();
  });

  it('GET /api/clients sin sesión → 401', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/metrics con cookie inválida → 401', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Cookie', 'fitzone_token=token-falso');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me sin sesión → 401 con mensaje claro', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('login OK → cookie HttpOnly y sin token en el body', async () => {
    const res = await request(app).post('/api/auth/login').send(TEST_ADMIN);
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie']?.[0] || '';
    expect(cookie).toContain('fitzone_token=');
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie).toContain('SameSite=Lax');
    expect(JSON.stringify(res.body)).not.toContain('token');
  });

  it('login con credenciales inválidas → 401 (no 500)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_ADMIN.username, password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('incorrectos');
  });

  it('GET /api/auth/users con rol RECEPCION → 403', async () => {
    const recepcion = await createUser(app, 'RECEPCION');
    const agent = await loginAs(app, recepcion.username, recepcion.password);
    const res = await agent.get('/api/auth/users');
    expect(res.status).toBe(403);
  });

  it('DELETE /api/clients/:id con rol RECEPCION → 403', async () => {
    const recepcion = await createUser(app, 'RECEPCION');
    const agent = await loginAs(app, recepcion.username, recepcion.password);
    const res = await agent.delete('/api/clients/99999999-9999-4999-8999-999999999999');
    expect(res.status).toBe(403);
  });

  it('POST /api/whatsapp/run-automated con rol RECEPCION → 403', async () => {
    const recepcion = await createUser(app, 'RECEPCION');
    const agent = await loginAs(app, recepcion.username, recepcion.password);
    const res = await agent.post('/api/whatsapp/run-automated');
    expect(res.status).toBe(403);
  });

  it('POST /api/auth/users con rol RECEPCION → 403', async () => {
    const recepcion = await createUser(app, 'RECEPCION');
    const agent = await loginAs(app, recepcion.username, recepcion.password);
    const res = await agent.post('/api/auth/users').send({
      name: 'Hack',
      email: 'hack@fitzone.test',
      password: 'password123',
      role: 'ADMIN',
    });
    expect(res.status).toBe(403);
  });

  it('ADMIN puede listar y crear usuarios', async () => {
    const admin = await loginAdmin(app);
    const list = await admin.get('/api/auth/users');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const created = await createUser(app, 'RECEPCION');
    expect(created.id).toBeTruthy();

    const del = await admin.delete(`/api/auth/users/${created.id}`);
    expect(del.status).toBe(200);
  });

  it('crear usuario con contraseña corta → 400', async () => {
    const admin = await loginAdmin(app);
    const res = await admin.post('/api/auth/users').send({
      name: 'Corto',
      email: 'corto@fitzone.test',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 caracteres');
  });

  it('crear usuario duplicado → 409', async () => {
    const admin = await loginAdmin(app);
    const body = { name: 'Dup', email: 'dup@fitzone.test', password: 'password123' };
    expect((await admin.post('/api/auth/users').send(body)).status).toBe(201);
    const dup = await admin.post('/api/auth/users').send(body);
    expect(dup.status).toBe(409);
  });

  it('logout borra la cookie y la sesión deja de servir', async () => {
    const agent = await loginAdmin(app);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect((out.headers['set-cookie']?.[0] || '')).toContain('Max-Age=0');
  });
});
