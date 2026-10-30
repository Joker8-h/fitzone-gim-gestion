import { Router } from 'express';
import { clientService } from '../services/clientService.js';
import { membershipService } from '../services/membershipService.js';
import { attendanceService } from '../services/attendanceService.js';
import { auditService } from '../services/auditService.js';

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

// POST /api/clients - Crear cliente con validación estricta (DP-001)
clientRouter.post('/', (req, res) => {
  try {
    const { documentId, fullName, phone, notes } = req.body;

    if (!documentId || typeof documentId !== 'string' || documentId.trim().length < 3) {
      return res.status(400).json({ error: 'El documento es obligatorio y debe tener al menos 3 caracteres.' });
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre completo es obligatorio.' });
    }
    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 7) {
      return res.status(400).json({ error: 'El teléfono debe contener al menos 7 dígitos válidos.' });
    }

    const newClient = clientService.create({ documentId, fullName, phone, notes });

    auditService.log(
      'CREATE_CLIENT',
      'Client',
      newClient.id,
      `Cliente creado: ${newClient.full_name} (CC: ${newClient.document_id})`,
      'Admin'
    );

    res.status(201).json(newClient);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/clients/:id - Actualizar cliente
clientRouter.put('/:id', (req, res) => {
  try {
    const { fullName, phone, notes, status } = req.body;
    if (phone && phone.replace(/\D/g, '').length < 7) {
      return res.status(400).json({ error: 'El teléfono debe contener al menos 7 dígitos.' });
    }

    const updated = clientService.update(req.params.id, { fullName, phone, notes, status });

    auditService.log(
      'UPDATE_CLIENT',
      'Client',
      updated.id,
      `Cliente modificado: ${updated.full_name}`,
      'Admin'
    );

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/clients/:id/deactivate - Desactivar cliente (RF-005)
clientRouter.patch('/:id/deactivate', (req, res) => {
  try {
    const deactivated = clientService.deactivate(req.params.id);

    auditService.log(
      'DEACTIVATE_CLIENT',
      'Client',
      deactivated.id,
      `Cliente marcado como INACTIVO: ${deactivated.full_name}`,
      'Admin'
    );

    res.json(deactivated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/clients/:id - Eliminar cliente
clientRouter.delete('/:id', (req, res) => {
  try {
    const client = clientService.getById(req.params.id);
    const result = clientService.delete(req.params.id);
    if (client) {
      auditService.log('DELETE_CLIENT', 'Client', client.id, `Cliente eliminado: ${client.full_name}`, 'Admin');
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
