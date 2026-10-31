import { Router } from 'express';
import { financeService } from '../services/financeService.js';
import { auditService } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const financeRouter = Router();

// GET /api/finances/categories - Listar categorías
financeRouter.get('/categories', async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await financeService.getCategories(type as any);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudieron cargar las categorías.' });
    console.error('[FINANCES] categories:', err.message);
  }
});

// POST /api/finances/categories - Crear categoría
financeRouter.post('/categories', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }
    const cat = await financeService.createCategory(name, type);
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/finances/transactions - Listar movimientos con filtros
financeRouter.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, type, categoryId } = req.query;
    const list = await financeService.listTransactions({
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as any,
      categoryId: categoryId as string,
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudieron cargar los movimientos.' });
    console.error('[FINANCES] transactions:', err.message);
  }
});

// POST /api/finances/transactions - Registrar movimiento manual (Ingreso o Egreso)
financeRouter.post('/transactions', async (req, res) => {
  try {
    const { type, categoryId, concept, amount, date, registeredBy } = req.body;
    if (!type || !concept || amount === undefined) {
      return res.status(400).json({ error: 'Tipo, Concepto y Monto son obligatorios' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número superior a 0' });
    }

    const tx = await financeService.createTransaction({
      type,
      categoryId,
      concept,
      amount: numericAmount,
      date,
      registeredBy: registeredBy || req.user?.name || 'Admin',
    });

    await auditService.log(
      'RECORD_TRANSACTION',
      'FinancialTransaction',
      tx.id,
      `${type}: ${concept} por $${numericAmount}`,
      registeredBy || req.user?.name || 'Admin'
    );

    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/finances/transactions/:id - Eliminar movimiento financiero (solo ADMIN)
financeRouter.delete('/transactions/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await financeService.deleteTransaction(req.params.id as string);
    await auditService.log(
      'DELETE_TRANSACTION',
      'FinancialTransaction',
      req.params.id as string,
      'Movimiento financiero eliminado',
      req.user?.name || 'Admin'
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/finances/coach-payment - Registrar pago a entrenador (RF-025)
financeRouter.post('/coach-payment', async (req, res) => {
  try {
    const { coachName, amount, periodConcept, date, registeredBy } = req.body;
    if (!coachName || !amount || !periodConcept) {
      return res.status(400).json({ error: 'Nombre del entrenador, monto y concepto del periodo son obligatorios' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'El valor a pagar debe ser mayor a 0' });
    }

    const tx = await financeService.recordCoachPayment({
      coachName,
      amount: numericAmount,
      periodConcept,
      date,
      registeredBy: registeredBy || req.user?.name || 'Admin',
    });

    await auditService.log(
      'COACH_PAYMENT',
      'FinancialTransaction',
      tx.id,
      `Pago a Entrenador ${coachName}: $${numericAmount} (${periodConcept})`,
      registeredBy || req.user?.name || 'Admin'
    );

    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/finances/summary - Resumen financiero por rango de fechas
financeRouter.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await financeService.getSummary(startDate as string, endDate as string);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo calcular el resumen financiero.' });
    console.error('[FINANCES] summary:', err.message);
  }
});
