import { Router } from 'express';
import { financeService } from '../services/financeService.js';
import { auditService } from '../services/auditService.js';

export const financeRouter = Router();

// GET /api/finances/categories - Listar categorías
financeRouter.get('/categories', (req, res) => {
  try {
    const { type } = req.query;
    const categories = financeService.getCategories(type as any);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finances/categories - Crear categoría
financeRouter.post('/categories', (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }
    const cat = financeService.createCategory(name, type);
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/finances/transactions - Listar movimientos con filtros
financeRouter.get('/transactions', (req, res) => {
  try {
    const { startDate, endDate, type, categoryId } = req.query;
    const list = financeService.listTransactions({
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as any,
      categoryId: categoryId as string,
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finances/transactions - Registrar movimiento manual (Ingreso o Egreso)
financeRouter.post('/transactions', (req, res) => {
  try {
    const { type, categoryId, concept, amount, date, registeredBy } = req.body;
    if (!type || !concept || amount === undefined) {
      return res.status(400).json({ error: 'Tipo, Concepto y Monto son obligatorios' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número superior a 0' });
    }

    const tx = financeService.createTransaction({
      type,
      categoryId,
      concept,
      amount: numericAmount,
      date,
      registeredBy: registeredBy || 'Admin',
    });

    auditService.log(
      'RECORD_TRANSACTION',
      'FinancialTransaction',
      tx.id,
      `${type}: ${concept} por $${numericAmount}`,
      registeredBy || 'Admin'
    );

    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/finances/transactions/:id - Eliminar movimiento financiero
financeRouter.delete('/transactions/:id', (req, res) => {
  try {
    res.json(financeService.deleteTransaction(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/finances/coach-payment - Registrar pago a entrenador (RF-025)
financeRouter.post('/coach-payment', (req, res) => {
  try {
    const { coachName, amount, periodConcept, date, registeredBy } = req.body;
    if (!coachName || !amount || !periodConcept) {
      return res.status(400).json({ error: 'Nombre del entrenador, monto y concepto del periodo son obligatorios' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'El valor a pagar debe ser mayor a 0' });
    }

    const tx = financeService.recordCoachPayment({
      coachName,
      amount: numericAmount,
      periodConcept,
      date,
      registeredBy: registeredBy || 'Admin',
    });

    auditService.log(
      'COACH_PAYMENT',
      'FinancialTransaction',
      tx.id,
      `Pago a Entrenador ${coachName}: $${numericAmount} (${periodConcept})`,
      registeredBy || 'Admin'
    );

    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/finances/summary - Resumen financiero por rango de fechas
financeRouter.get('/summary', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = financeService.getSummary(startDate as string, endDate as string);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
