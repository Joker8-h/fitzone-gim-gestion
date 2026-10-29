import { Router } from 'express';
import { membershipService } from '../services/membershipService.js';

export const membershipRouter = Router();

// GET /api/memberships/plans - Listar catálogo de planes
membershipRouter.get('/plans', (req, res) => {
  try {
    const plans = membershipService.getPlans(req.query.all !== 'true');
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memberships/plans - Crear nuevo plan
membershipRouter.post('/plans', (req, res) => {
  try {
    const { name, durationDays, price, description } = req.body;
    if (!name || !durationDays || !price) {
      return res.status(400).json({ error: 'Nombre, duración en días y precio son obligatorios' });
    }
    const plan = membershipService.createPlan({
      name,
      durationDays: Number(durationDays),
      price: Number(price),
      description,
    });
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/memberships/assign - Asignar y cobrar membresía (Suma días si activa - DP-002)
membershipRouter.post('/assign', (req, res) => {
  try {
    const { clientId, planId, amountPaid, paymentMethod, reference, notes, registeredBy } = req.body;
    if (!clientId || !planId || amountPaid === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Cliente, Plan, Monto y Medio de pago son obligatorios' });
    }

    const result = membershipService.assignMembership({
      clientId,
      planId,
      amountPaid: Number(amountPaid),
      paymentMethod,
      reference,
      notes,
      registeredBy,
    });

    res.status(201).json({
      message: 'Membresía asignada y pago registrado con éxito',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
