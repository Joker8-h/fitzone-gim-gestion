import { Router } from 'express';
import { z } from 'zod';
import { operationsService } from '../services/operationsService.js';
import { parse } from '../middleware/validate.js';

export const operationsRouter = Router();

// --- Schemas Zod (D7) ---

const idParamSchema = z.object({ id: z.string().min(1) });

const createClassSchema = z.object({
  name: z.string({ error: 'Nombre, instructor y horario son obligatorios' }).trim().min(1, 'Nombre, instructor y horario son obligatorios'),
  instructorName: z.string({ error: 'Nombre, instructor y horario son obligatorios' }).trim().min(1, 'Nombre, instructor y horario son obligatorios'),
  scheduleTime: z.string({ error: 'Nombre, instructor y horario son obligatorios' }).trim().min(1, 'Nombre, instructor y horario son obligatorios'),
  enrolledCount: z.coerce.number().int().nonnegative().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  colorTheme: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

const enrollmentSchema = z.object({ delta: z.coerce.number().int().optional() });

const createEventSchema = z.object({
  title: z.string({ error: 'Todos los campos del evento son obligatorios' }).trim().min(1, 'Todos los campos del evento son obligatorios'),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
  dayNum: z
    .string({ error: 'Todos los campos del evento son obligatorios' })
    .trim()
    .regex(/^\d{1,2}$/, 'El día del evento debe ser un número del 1 al 31'),
  monthShort: z.string({ error: 'Todos los campos del evento son obligatorios' }).trim().min(1, 'Todos los campos del evento son obligatorios'),
  timeRange: z.string({ error: 'Todos los campos del evento son obligatorios' }).trim().min(1, 'Todos los campos del evento son obligatorios'),
});

const createEmployeeSchema = z.object({
  fullName: z.string({ error: 'Nombre, cargo y teléfono son obligatorios' }).trim().min(1, 'Nombre, cargo y teléfono son obligatorios'),
  role: z.string({ error: 'Nombre, cargo y teléfono son obligatorios' }).trim().min(1, 'Nombre, cargo y teléfono son obligatorios'),
  specialty: z.string().trim().optional(),
  phone: z.string({ error: 'Nombre, cargo y teléfono son obligatorios' }).trim().min(1, 'Nombre, cargo y teléfono son obligatorios'),
  salary: z.coerce.number().nonnegative().optional(),
});

const createEquipmentSchema = z.object({
  name: z.string({ error: 'Nombre y categoría del equipo son obligatorios' }).trim().min(1, 'Nombre y categoría del equipo son obligatorios'),
  category: z.string({ error: 'Nombre y categoría del equipo son obligatorios' }).trim().min(1, 'Nombre y categoría del equipo son obligatorios'),
  status: z.string().trim().optional(),
  lastMaintenance: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
});

const equipmentStatusSchema = z.object({
  status: z.string({ error: 'Estado requerido' }).trim().min(1, 'Estado requerido'),
  lastMaintenance: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
    .optional(),
});

// --- CLASES ---
operationsRouter.get('/classes', async (_req, res) => {
  res.json(await operationsService.listClasses());
});

operationsRouter.post('/classes', async (req, res) => {
  const data = parse(createClassSchema, req.body);
  const created = await operationsService.createClass({
    name: data.name,
    instructorName: data.instructorName,
    scheduleTime: data.scheduleTime,
    enrolledCount: data.enrolledCount ?? 0,
    capacity: data.capacity ?? 20,
    colorTheme: data.colorTheme,
    status: data.status,
  });
  res.status(201).json(created);
});

operationsRouter.patch('/classes/:id/enrollment', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { delta } = parse(enrollmentSchema, req.body);
  res.json(await operationsService.updateClassEnrollment(id, delta ?? 1));
});

operationsRouter.delete('/classes/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await operationsService.deleteClass(id));
});

// --- EVENTOS ---
operationsRouter.get('/events', async (_req, res) => {
  res.json(await operationsService.listEvents());
});

operationsRouter.post('/events', async (req, res) => {
  const data = parse(createEventSchema, req.body);
  const created = await operationsService.createEvent({
    title: data.title,
    eventDate: data.eventDate || new Date().toISOString().split('T')[0],
    dayNum: data.dayNum,
    monthShort: data.monthShort,
    timeRange: data.timeRange,
  });
  res.status(201).json(created);
});

operationsRouter.delete('/events/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await operationsService.deleteEvent(id));
});

// --- EMPLEADOS ---
operationsRouter.get('/employees', async (_req, res) => {
  res.json(await operationsService.listEmployees());
});

operationsRouter.post('/employees', async (req, res) => {
  const data = parse(createEmployeeSchema, req.body);
  const created = await operationsService.createEmployee({
    fullName: data.fullName,
    role: data.role,
    specialty: data.specialty,
    phone: data.phone,
    salary: data.salary,
  });
  res.status(201).json(created);
});

operationsRouter.patch('/employees/:id/toggle', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await operationsService.toggleEmployeeStatus(id));
});

operationsRouter.delete('/employees/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await operationsService.deleteEmployee(id));
});

// --- EQUIPOS ---
operationsRouter.get('/equipment', async (_req, res) => {
  res.json(await operationsService.listEquipment());
});

operationsRouter.post('/equipment', async (req, res) => {
  const data = parse(createEquipmentSchema, req.body);
  const created = await operationsService.createEquipment({
    name: data.name,
    category: data.category,
    status: data.status,
    lastMaintenance: data.lastMaintenance,
  });
  res.status(201).json(created);
});

operationsRouter.patch('/equipment/:id/status', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { status, lastMaintenance } = parse(equipmentStatusSchema, req.body);
  res.json(await operationsService.updateEquipmentStatus(id, status, lastMaintenance));
});

operationsRouter.delete('/equipment/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await operationsService.deleteEquipment(id));
});
