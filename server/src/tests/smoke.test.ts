import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestData, TEST_ADMIN } from './setup.js';

const app = createApp();

const ADMIN = TEST_ADMIN;

describe('smoke: la app responde y protege rutas', () => {
  beforeAll(async () => {
    await resetTestData();
  });

  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/clients sin sesión → 401', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login con credenciales válidas → 200 y cookie HttpOnly', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    const cookie = res.headers['set-cookie']?.[0] || '';
    expect(cookie).toContain('fitzone_token=');
    expect(cookie.toLowerCase()).toContain('httponly');
    // La sesión NUNCA viaja en el body
    expect(JSON.stringify(res.body)).not.toContain('token');
  });

  it('POST /api/auth/login con contraseña mala → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: ADMIN.username, password: 'clave-mala' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login vacío → 400 con mensaje en español', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('usuario');
  });

  it('POST /api/auth/login con JSON malformado → 400 sin filtrar stack', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username":');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('JSON');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
  });
});
