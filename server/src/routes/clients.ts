import { Router } from 'express';
import { clientService } from '../services/clientService.js';
import { membershipService } from '../services/membershipService.js';
import { attendanceService } from '../services/attendanceService.js';

export const clientRouter = Router();

// GET /api/clients - Listar con filtro de búsqueda
clientRouter.get('/', (req, res) => {
  try {
    const { search, status } = req.query;
    const clients = clientService.list(search as string, status as string);
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id - Detalle completo de cliente
clientRouter.get('/:id', (req, res) => {
  try {
    const client = clientService.getById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const latestMembership = membershipService.getLatestMembership(client.id);
    const memberships = membershipService.getClientMemberships(client.id);
    const payments = membershipService.getClientPayments(client.id);
    const attendances = attendanceService.getClientHistory(client.id);

    res.json({
      client,
      latestMembership,
      memberships,
      payments,
      attendances,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients - Crear cliente
clientRouter.post('/', (req, res) => {
  try {
    const { documentId, fullName, phone, notes } = req.body;
    if (!documentId || !fullName || !phone) {
      return res.status(400).json({ error: 'Documento, Nombre y Teléfono son obligatorios' });
    }

    const newClient = clientService.create({ documentId, fullName, phone, notes });
    res.status(201).json(newClient);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/clients/:id - Actualizar cliente
clientRouter.put('/:id', (req, res) => {
  try {
    const { fullName, phone, notes, status } = req.body;
    const updated = clientService.update(req.params.id, { fullName, phone, notes, status });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/clients/:id/deactivate - Desactivar cliente (RF-005)
clientRouter.patch('/:id/deactivate', (req, res) => {
  try {
    const deactivated = clientService.deactivate(req.params.id);
    res.json(deactivated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
