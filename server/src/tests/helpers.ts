/**
 * Helpers compartidos por los tests de rutas (Fase 2 — D1).
 * Hablan contra la app Express real vía supertest, sobre la BD de prueba.
 */
import request from 'supertest';
import type { Express } from 'express';
import { TEST_ADMIN } from './setup.js';

export { TEST_ADMIN };

/**
 * Tipo del agente supertest con cookies persistentes.
 * `ReturnType` evita la ambigüedad de `request.Test` entre módulos.
 */
export type Agent = ReturnType<typeof request.agent>;

/** Devuelve el agente supertest con la cookie de sesión del admin. */
export async function loginAdmin(app: Express): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(TEST_ADMIN);
  if (res.status !== 200) {
    throw new Error(`Login de admin falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}

/** Crea un usuario con el rol indicado y devuelve sus credenciales. */
export async function createUser(
  app: Express,
  role: 'ADMIN' | 'RECEPCION'
): Promise<{ username: string; password: string; id: string }> {
  const admin = await loginAdmin(app);
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `test-${role.toLowerCase()}-${suffix}@fitzone.test`;
  const password = `Pass-${suffix}-123`;
  const created = await admin.post('/api/auth/users').send({
    name: `Test ${role} ${suffix}`,
    email,
    password,
    role,
  });
  if (created.status !== 201) {
    throw new Error(`Creación de usuario falló: ${created.status} ${JSON.stringify(created.body)}`);
  }
  return { username: email, password, id: created.body.id };
}

/** Login con credenciales arbitrarias (devuelve el agente con su cookie). */
export async function loginAs(
  app: Express,
  username: string,
  password: string
): Promise<Agent> {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
}

/** Crea un cliente y devuelve su id (para tests que necesitan datos). */
export async function createClient(
  app: Express,
  agent: Agent,
  overrides: Partial<{ documentId: string; fullName: string; phone: string }> = {}
): Promise<string> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const res = await agent.post('/api/clients').send({
    documentId: overrides.documentId ?? `900${suffix}${Math.floor(Math.random() * 9000 + 1000)}`.slice(0, 10),
    fullName: overrides.fullName ?? `Cliente Test ${suffix}`,
    phone: overrides.phone ?? `300${Math.floor(Math.random() * 9000000 + 1000000)}`,
  });
  if (res.status !== 201) {
    throw new Error(`Creación de cliente falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.id;
}

/** Crea un plan de membresía y devuelve su id. */
export async function createPlan(
  app: Express,
  agent: Agent,
  overrides: Partial<{ name: string; durationDays: number; price: number }> = {}
): Promise<{ id: string; price: number }> {
  const suffix = Math.random().toString(36).slice(2, 6);
  const res = await agent.post('/api/memberships/plans').send({
    name: overrides.name ?? `Plan Test ${suffix}`,
    durationDays: overrides.durationDays ?? 30,
    price: overrides.price ?? 100000,
  });
  if (res.status !== 201) {
    throw new Error(`Creación de plan falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.id, price: res.body.price };
}

/** Asigna una membresía (DP-002) y devuelve la respuesta. */
export async function assignMembership(
  agent: Agent,
  clientId: string,
  planId: string,
  extra: Record<string, unknown> = {}
) {
  return agent.post('/api/memberships/assign').send({ clientId, planId, ...extra });
}
