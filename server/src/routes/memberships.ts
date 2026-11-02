import { Router } from 'express';
import { z } from 'zod';
import { membershipService } from '../services/membershipService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { badRequest } from '../errors.js';

export const membershipRouter = Router();

// --- Schemas Zod (D7) ---

const idParamSchema = z.object({ id: z.string().min(1) });

const listPlansQuerySchema = z.object({ all: z.string().optional() });

const createPlanSchema = z.object({
  name: z
    .string({ error: 'El nombre del plan es obligatorio' })
    .trim()
    .min(1, 'El nombre del plan es obligatorio'),
  durationDays: z.coerce
    .number({ error: 'La duración en días debe ser un número entero mayor a 0' })
    .int('La duración en días debe ser un número entero mayor a 0')
    .positive('La duración en días debe ser un número entero mayor a 0'),
  price: z.coerce
    .number({ error: 'El precio debe ser un número mayor a 0' })
    .positive('El precio debe ser un número mayor a 0'),
  description: z.string().trim().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).optional(),
  durationDays: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive().optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

const paymentMethods = ['EFECTIVO', 'NEQUI', 'DAVIPLATA', 'TRANSFERENCIA', 'TARJETA'] as const;

const assignSchema = z.object({
  clientId: z.string({ error: 'Cliente y Plan son obligatorios' }).min(1, 'Cliente y Plan son obligatorios'),
  planId: z.string({ error: 'Cliente y Plan son obligatorios' }).min(1, 'Cliente y Plan son obligatorios'),
  // Se aceptan las dos claves que usa el front (amountPaid o pricePaid);
  // si ninguna viene, el servicio toma el precio del plan.
  amountPaid: z.coerce.number().positive('El valor pagado debe ser un número superior a 0').optional(),
  pricePaid: z.coerce.number().positive('El valor pagado debe ser un número superior a 0').optional(),
  paymentMethod: z.enum(paymentMethods, { error: 'Método de pago no reconocido' }).optional(),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  registeredBy: z.string().trim().optional(),
});

// GET /api/memberships/plans - Listar catálogo de planes
membershipRouter.get('/plans', async (req, res) => {
  const { all } = parse(listPlansQuerySchema, req.query);
  res.json(await membershipService.getPlans(all !== 'true'));
});

// POST /api/memberships/plans - Crear nuevo plan
membershipRouter.post('/plans', async (req, res) => {
  const data = parse(createPlanSchema, req.body);
  const plan = await membershipService.createPlan({
    name: data.name,
    durationDays: Math.floor(data.durationDays),
    price: data.price,
    description: data.description,
  });

  await auditService.log(
    'CREATE_PLAN',
    'MembershipPlan',
    plan.id,
    `Nuevo plan creado: ${plan.name} (${plan.duration_days} días por $${plan.price})`,
    req.user?.name || 'Admin'
  );

  res.status(201).json(plan);
});

// PUT /api/memberships/plans/:id - Editar plan
membershipRouter.put('/plans/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const data = parse(updatePlanSchema, req.body);
  res.json(await membershipService.updatePlan(id, data));
});

// DELETE /api/memberships/plans/:id - Eliminar o desactivar plan (solo ADMIN)
membershipRouter.delete('/plans/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await membershipService.deletePlan(id));
});

// POST /api/memberships/assign - Asignar y cobrar membresía (Suma días si activa - DP-002)
membershipRouter.post('/assign', async (req, res) => {
  const data = parse(assignSchema, req.body);

  // Monto: amountPaid → pricePaid → precio del plan (compatibilidad con el front)
  const plan = await membershipService.getPlanById(data.planId);
  const rawValue = data.amountPaid ?? data.pricePaid ?? plan?.price;
  const amount = Number(rawValue);
  if (isNaN(amount) || amount <= 0) {
    throw badRequest('El valor pagado debe ser un número superior a 0');
  }

  const methodUpper = (data.paymentMethod || 'EFECTIVO').toUpperCase();

  const result = await membershipService.assignMembership({
    clientId: data.clientId,
    planId: data.planId,
    amountPaid: amount,
    paymentMethod: methodUpper,
    reference: data.reference,
    notes: data.notes,
    registeredBy: data.registeredBy || 'Recepción',
  });

  await auditService.log(
    'ASSIGN_MEMBERSHIP',
    'ClientMembership',
    result.membership.id,
    `Membresía asignada a cliente ${data.clientId}. Pago de $${amount} vía ${methodUpper}`,
    data.registeredBy || 'Recepción'
  );

  res.status(201).json({
    message: 'Membresía asignada y pago registrado con éxito',
    ...result,
  });
});
