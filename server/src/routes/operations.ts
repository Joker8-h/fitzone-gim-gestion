import { Router } from 'express';
import { operationsService } from '../services/operationsService.js';

export const operationsRouter = Router();

// --- CLASES ---
operationsRouter.get('/classes', (_req, res) => {
  try {
    res.json(operationsService.listClasses());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

operationsRouter.post('/classes', (req, res) => {
  try {
    const { name, instructorName, scheduleTime, enrolledCount, capacity, colorTheme, status } = req.body;
    if (!name || !instructorName || !scheduleTime) {
      return res.status(400).json({ error: 'Nombre, instructor y horario son obligatorios' });
    }
    const created = operationsService.createClass({
      name,
      instructorName,
      scheduleTime,
      enrolledCount: Number(enrolledCount) || 0,
      capacity: Number(capacity) || 20,
      colorTheme,
      status
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.patch('/classes/:id/enrollment', (req, res) => {
  try {
    const delta = Number(req.body.delta) || 1;
    const updated = operationsService.updateClassEnrollment(req.params.id, delta);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.delete('/classes/:id', (req, res) => {
  try {
    res.json(operationsService.deleteClass(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- EVENTOS ---
operationsRouter.get('/events', (_req, res) => {
  try {
    res.json(operationsService.listEvents());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

operationsRouter.post('/events', (req, res) => {
  try {
    const { title, eventDate, dayNum, monthShort, timeRange } = req.body;
    if (!title || !dayNum || !monthShort || !timeRange) {
      return res.status(400).json({ error: 'Todos los campos del evento son obligatorios' });
    }
    const created = operationsService.createEvent({
      title,
      eventDate: eventDate || new Date().toISOString().split('T')[0],
      dayNum,
      monthShort,
      timeRange
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.delete('/events/:id', (req, res) => {
  try {
    res.json(operationsService.deleteEvent(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- EMPLEADOS ---
operationsRouter.get('/employees', (_req, res) => {
  try {
    res.json(operationsService.listEmployees());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

operationsRouter.post('/employees', (req, res) => {
  try {
    const { fullName, role, specialty, phone, salary } = req.body;
    if (!fullName || !role || !phone) {
      return res.status(400).json({ error: 'Nombre, cargo y teléfono son obligatorios' });
    }
    const created = operationsService.createEmployee({ fullName, role, specialty, phone, salary });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.patch('/employees/:id/toggle', (req, res) => {
  try {
    res.json(operationsService.toggleEmployeeStatus(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.delete('/employees/:id', (req, res) => {
  try {
    res.json(operationsService.deleteEmployee(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- EQUIPOS ---
operationsRouter.get('/equipment', (_req, res) => {
  try {
    res.json(operationsService.listEquipment());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

operationsRouter.post('/equipment', (req, res) => {
  try {
    const { name, category, status, lastMaintenance } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Nombre y categoría del equipo son obligatorios' });
    }
    const created = operationsService.createEquipment({ name, category, status, lastMaintenance });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.patch('/equipment/:id/status', (req, res) => {
  try {
    const { status, lastMaintenance } = req.body;
    if (!status) return res.status(400).json({ error: 'Estado requerido' });
    res.json(operationsService.updateEquipmentStatus(req.params.id, status, lastMaintenance));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.delete('/equipment/:id', (req, res) => {
  try {
    res.json(operationsService.deleteEquipment(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
