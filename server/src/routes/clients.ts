import { Router } from 'express';
import { z } from 'zod';
import { clientService } from '../services/clientService.js';
import { membershipService } from '../services/membershipService.js';
import { attendanceService } from '../services/attendanceService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { notFound } from '../errors.js';

export const clientRouter = Router();

// --- Schemas Zod (D7): reemplazan las validaciones manuales duplicadas ---

// El teléfono debe tener al menos 7 dígitos válidos (ignora formatos +, espacios, guiones)
const phoneSchema = z
  .string({ error: 'El teléfono es obligatorio.' })
  .refine((v) => v.replace(/\D/g, '').length >= 7, {
    error: 'El teléfono debe contener al menos 7 dígitos válidos.',
  });

const createClientSchema = z.object({
  documentId: z
    .string({ error: 'El documento es obligatorio y debe tener al menos 3 caracteres.' })
    .trim()
    .min(3, 'El documento es obligatorio y debe tener al menos 3 caracteres.'),
  fullName: z
    .string({ error: 'El nombre completo es obligatorio.' })
    .trim()
    .min(2, 'El nombre completo es obligatorio.'),
  phone: phoneSchema,
  notes: z.string().trim().optional(),
});

const updateClientSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length >= 7, {
      error: 'El teléfono debe contener al menos 7 dígitos.',
    })
    .optional(),
  notes: z.string().trim().optional(),
  status: z.enum(['ACTIVO', 'INACTIVO']).optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
});

// GET /api/clients - Listar con filtro de búsqueda
clientRouter.get('/', async (req, res) => {
  const { search, status } = parse(listQuerySchema, req.query);
  res.json(await clientService.list(search, status));
});

// GET /api/clients/:id - Detalle completo de cliente
clientRouter.get('/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const client = await clientService.getById(id);
  if (!client) throw notFound('Cliente no encontrado');

  const [latestMembership, memberships, payments, attendances] = await Promise.all([
    membershipService.getLatestMembership(client.id),
    membershipService.getClientMemberships(client.id),
    membershipService.getClientPayments(client.id),
    attendanceService.getClientHistory(client.id),
  ]);

  res.json({ client, latestMembership, memberships, payments, attendances });
});

// POST /api/clients - Crear cliente con validación estricta (DP-001)
clientRouter.post('/', async (req, res) => {
  const data = parse(createClientSchema, req.body);
  const newClient = await clientService.create(data);

  await auditService.log(
    'CREATE_CLIENT',
    'Client',
    newClient.id,
    `Cliente creado: ${newClient.full_name} (CC: ${newClient.document_id})`,
    req.user?.name || 'Admin'
  );

  res.status(201).json(newClient);
});

// PUT /api/clients/:id - Actualizar cliente
clientRouter.put('/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const data = parse(updateClientSchema, req.body);
  const updated = await clientService.update(id, data);

  await auditService.log(
    'UPDATE_CLIENT',
    'Client',
    updated.id,
    `Cliente modificado: ${updated.full_name}`,
    req.user?.name || 'Admin'
  );

  res.json(updated);
});

// PATCH /api/clients/:id/deactivate - Desactivar cliente (RF-005)
clientRouter.patch('/:id/deactivate', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const deactivated = await clientService.deactivate(id);

  await auditService.log(
    'DEACTIVATE_CLIENT',
    'Client',
    deactivated.id,
    `Cliente marcado como INACTIVO: ${deactivated.full_name}`,
    req.user?.name || 'Admin'
  );

  res.json(deactivated);
});

// DELETE /api/clients/:id - Eliminar cliente (solo ADMIN)
clientRouter.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const client = await clientService.getById(id);
  const result = await clientService.delete(id);
  if (client) {
    await auditService.log('DELETE_CLIENT', 'Client', client.id, `Cliente eliminado: ${client.full_name}`, req.user?.name || 'Admin');
  }
  res.json(result);
});
