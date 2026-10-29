import { Router } from 'express';
import { financeService } from '../services/financeService.js';

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
    const tx = financeService.createTransaction({
      type,
      categoryId,
      concept,
      amount: Number(amount),
      date,
      registeredBy,
    });
    res.status(201).json(tx);
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
    const tx = financeService.recordCoachPayment({
      coachName,
      amount: Number(amount),
      periodConcept,
      date,
      registeredBy,
    });
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
