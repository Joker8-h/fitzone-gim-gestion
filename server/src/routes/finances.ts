import { Router } from 'express';
import { z } from 'zod';
import { financeService } from '../services/financeService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';

export const financeRouter = Router();

// --- Schemas Zod (D7) ---

const idParamSchema = z.object({ id: z.string().min(1) });

const categoryType = z.enum(['INGRESO', 'EGRESO']);

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD');

const listCategoriesQuerySchema = z.object({ type: categoryType.optional() });

const createCategorySchema = z.object({
  name: z.string({ error: 'Nombre y tipo son obligatorios' }).trim().min(1, 'Nombre y tipo son obligatorios'),
  type: categoryType,
});

const listTransactionsQuerySchema = z.object({
  startDate: dateStr.optional(),
  endDate: dateStr.optional(),
  type: categoryType.optional(),
  categoryId: z.string().optional(),
});

const createTransactionSchema = z.object({
  type: categoryType,
  categoryId: z.string().optional(),
  concept: z.string({ error: 'Tipo, Concepto y Monto son obligatorios' }).trim().min(1, 'Tipo, Concepto y Monto son obligatorios'),
  amount: z.coerce
    .number({ error: 'El monto debe ser un número superior a 0' })
    .positive('El monto debe ser un número superior a 0'),
  date: dateStr.optional(),
  registeredBy: z.string().trim().optional(),
});

const coachPaymentSchema = z.object({
  coachName: z
    .string({ error: 'Nombre del entrenador, monto y concepto del periodo son obligatorios' })
    .trim()
    .min(1, 'Nombre del entrenador, monto y concepto del periodo son obligatorios'),
  amount: z.coerce
    .number({ error: 'El valor a pagar debe ser mayor a 0' })
    .positive('El valor a pagar debe ser mayor a 0'),
  periodConcept: z
    .string({ error: 'Nombre del entrenador, monto y concepto del periodo son obligatorios' })
    .trim()
    .min(1, 'Nombre del entrenador, monto y concepto del periodo son obligatorios'),
  date: dateStr.optional(),
  registeredBy: z.string().trim().optional(),
});

const summaryQuerySchema = z.object({
  startDate: dateStr.optional(),
  endDate: dateStr.optional(),
});

// GET /api/finances/categories - Listar categorías
financeRouter.get('/categories', async (req, res) => {
  const { type } = parse(listCategoriesQuerySchema, req.query);
  res.json(await financeService.getCategories(type));
});

// POST /api/finances/categories - Crear categoría
financeRouter.post('/categories', async (req, res) => {
  const { name, type } = parse(createCategorySchema, req.body);
  res.status(201).json(await financeService.createCategory(name, type));
});

// GET /api/finances/transactions - Listar movimientos con filtros
financeRouter.get('/transactions', async (req, res) => {
  const filters = parse(listTransactionsQuerySchema, req.query);
  res.json(await financeService.listTransactions(filters));
});

// POST /api/finances/transactions - Registrar movimiento manual (Ingreso o Egreso)
financeRouter.post('/transactions', async (req, res) => {
  const data = parse(createTransactionSchema, req.body);
  const tx = await financeService.createTransaction({
    type: data.type,
    categoryId: data.categoryId,
    concept: data.concept,
    amount: data.amount,
    date: data.date,
    registeredBy: data.registeredBy || req.user?.name || 'Admin',
  });

  await auditService.log(
    'RECORD_TRANSACTION',
    'FinancialTransaction',
    tx.id,
    `${data.type}: ${data.concept} por $${data.amount}`,
    data.registeredBy || req.user?.name || 'Admin'
  );

  res.status(201).json(tx);
});

// DELETE /api/finances/transactions/:id - Eliminar movimiento financiero (solo ADMIN)
financeRouter.delete('/transactions/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const result = await financeService.deleteTransaction(id);
  await auditService.log(
    'DELETE_TRANSACTION',
    'FinancialTransaction',
    id,
    'Movimiento financiero eliminado',
    req.user?.name || 'Admin'
  );
  res.json(result);
});

// POST /api/finances/coach-payment - Registrar pago a entrenador (RF-025)
financeRouter.post('/coach-payment', async (req, res) => {
  const data = parse(coachPaymentSchema, req.body);
  const tx = await financeService.recordCoachPayment({
    coachName: data.coachName,
    amount: data.amount,
    periodConcept: data.periodConcept,
    date: data.date,
    registeredBy: data.registeredBy || req.user?.name || 'Admin',
  });

  await auditService.log(
    'COACH_PAYMENT',
    'FinancialTransaction',
    tx.id,
    `Pago a Entrenador ${data.coachName}: $${data.amount} (${data.periodConcept})`,
    data.registeredBy || req.user?.name || 'Admin'
  );

  res.status(201).json(tx);
});

// GET /api/finances/summary - Resumen financiero por rango de fechas
financeRouter.get('/summary', async (req, res) => {
  const { startDate, endDate } = parse(summaryQuerySchema, req.query);
  res.json(await financeService.getSummary(startDate, endDate));
});
