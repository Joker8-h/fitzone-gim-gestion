import { Router } from 'express';
import { membershipService } from '../services/membershipService.js';
import { auditService } from '../services/auditService.js';

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
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre del plan es obligatorio' });
    }
    const days = Number(durationDays);
    const amount = Number(price);

    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'La duración en días debe ser un número entero mayor a 0' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' });
    }

    const plan = membershipService.createPlan({
      name: name.trim(),
      durationDays: Math.floor(days),
      price: amount,
      description: description ? description.trim() : undefined,
    });

    auditService.log(
      'CREATE_PLAN',
      'MembershipPlan',
      plan.id,
      `Nuevo plan creado: ${plan.name} (${plan.duration_days} días por $${plan.price})`,
      'Admin'
    );

    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/memberships/plans/:id - Editar plan
membershipRouter.put('/plans/:id', (req, res) => {
  try {
    const { name, durationDays, price, description, isActive } = req.body;
    const updated = membershipService.updatePlan(req.params.id, {
      name,
      durationDays: durationDays !== undefined ? Number(durationDays) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      description,
      isActive,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/memberships/plans/:id - Eliminar o desactivar plan
membershipRouter.delete('/plans/:id', (req, res) => {
  try {
    res.json(membershipService.deletePlan(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/memberships/assign - Asignar y cobrar membresía (Suma días si activa - DP-002)
membershipRouter.post('/assign', (req, res) => {
  try {
    const {
      clientId,
      planId,
      amountPaid,
      pricePaid,
      paymentMethod,
      reference,
      notes,
      registeredBy,
    } = req.body;

    if (!clientId || !planId) {
      return res.status(400).json({ error: 'Cliente y Plan son obligatorios' });
    }

    const plan = membershipService.getPlanById(String(planId));
    const rawValue = amountPaid ?? pricePaid ?? plan?.price;
    const amount = Number(rawValue);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'El valor pagado debe ser un número superior a 0' });
    }

    const validMethods = ['EFECTIVO', 'NEQUI', 'DAVIPLATA', 'TRANSFERENCIA', 'TARJETA'];
    const methodUpper = (paymentMethod || 'EFECTIVO').toUpperCase();
    if (!validMethods.includes(methodUpper)) {
      return res.status(400).json({ error: 'Método de pago no reconocido' });
    }

    const result = membershipService.assignMembership({
      clientId,
      planId,
      amountPaid: amount,
      paymentMethod: methodUpper,
      reference,
      notes,
      registeredBy: registeredBy || 'Recepción',
    });

    auditService.log(
      'ASSIGN_MEMBERSHIP',
      'ClientMembership',
      result.membership.id,
      `Membresía asignada a cliente ${clientId}. Pago de $${amount} vía ${methodUpper}`,
      registeredBy || 'Recepción'
    );

    res.status(201).json({
      message: 'Membresía asignada y pago registrado con éxito',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
