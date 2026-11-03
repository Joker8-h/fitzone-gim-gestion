/**
 * Tests del rate limiting anti-fuerza bruta (Fase 2 — D1).
 *
 * La suite global relaja los límites (hacen decenas de logins desde la misma
 * IP), así que aquí se levanta una app MINI con `rateLimiter` propio para
 * verificar que el 429 y el `retryAfter` siguen funcionando de verdad.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { rateLimiter } from '../middleware/security.js';

function buildApp(maxRequests: number, windowMs = 60 * 1000): express.Express {
  const app = express();
  // Con trust proxy, req.ip lee X-Forwarded-For: permite simular IPs distintas
  // (el mapa de rate limiting es global por proceso)
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(
    rateLimiter({
      windowMs,
      maxRequests,
      message: 'Demasiadas solicitudes desde esta IP. Por favor espera un minuto.',
    })
  );
  app.get('/api/protegido', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

/** IP única por test: el rateLimitMap es compartido a nivel de módulo. */
let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.11.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

describe('rateLimiter: 429 anti-fuerza bruta', () => {
  it('permite hasta el límite y devuelve 429 con retryAfter al excederlo', async () => {
    const app = buildApp(2);
    const ip = uniqueIp();
    const hit = () => request(app).get('/api/protegido').set('X-Forwarded-For', ip);

    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(200);

    const blocked = await hit();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain('Demasiadas solicitudes');
    expect(blocked.body.retryAfter).toBeGreaterThan(0);
    expect(Number.isInteger(blocked.body.retryAfter)).toBe(true);
  });

  it('la app bloqueada sigue devolviendo 429 en peticiones subsiguientes', async () => {
    const app = buildApp(1);
    const ip = uniqueIp();
    const hit = () => request(app).get('/api/protegido').set('X-Forwarded-For', ip);

    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(429);
    expect((await hit()).status).toBe(429);
  });

  it('una IP distinta tiene su propio contador', async () => {
    const app = buildApp(1);
    const ipA = uniqueIp();
    const ipB = uniqueIp();

    // Agota el límite de LA IP A
    expect((await request(app).get('/api/protegido').set('X-Forwarded-For', ipA)).status).toBe(200);
    expect((await request(app).get('/api/protegido').set('X-Forwarded-For', ipA)).status).toBe(429);

    // La IP B no consumió el límite de la A
    const otherIp = await request(app).get('/api/protegido').set('X-Forwarded-For', ipB);
    expect(otherIp.status).toBe(200);
  });

  it('el límite se reinicia tras la ventana (windowMs corta)', async () => {
    const app = buildApp(1, 300); // ventana de 300 ms
    const ip = uniqueIp();
    const hit = () => request(app).get('/api/protegido').set('X-Forwarded-For', ip);

    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(429);

    await new Promise((r) => setTimeout(r, 350));

    expect((await hit()).status).toBe(200);
  });
});
