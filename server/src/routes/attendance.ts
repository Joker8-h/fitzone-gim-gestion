import { Router } from 'express';
import { z } from 'zod';
import { attendanceService } from '../services/attendanceService.js';
import { clientService } from '../services/clientService.js';
import { auditService } from '../services/auditService.js';
import { parse } from '../middleware/validate.js';
import { notFound, badRequest } from '../errors.js';

export const attendanceRouter = Router();

// --- Schemas Zod (D7) ---

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD');

const listQuerySchema = z.object({ date: dateSchema.optional() });

const checkInSchema = z.object({
  documentId: z.string().trim().optional(),
  clientId: z.string().uuid().optional(),
  override: z.boolean().optional(),
  overrideReason: z.string().trim().optional(),
  registeredBy: z.string().trim().optional(),
});

const historyParamsSchema = z.object({ clientId: z.string().min(1) });

// GET /api/attendance - Listar asistencias (todas o filtradas por fecha)
attendanceRouter.get('/', async (req, res) => {
  const { date } = parse(listQuerySchema, req.query);
  res.json(await attendanceService.listAttendances(date));
});

// POST /api/attendance/check-in - Marcaje de asistencia con bloqueo de vencidos (DP-003)
attendanceRouter.post('/check-in', async (req, res) => {
  const body = parse(checkInSchema, req.body);

  let resolvedDoc = body.documentId || '';
  if (!resolvedDoc && body.clientId) {
    const client = await clientService.getById(body.clientId);
    if (!client) throw notFound('Miembro no encontrado.');
    resolvedDoc = client.document_id;
  }

  if (!resolvedDoc || resolvedDoc.length < 3) {
    throw badRequest('El número de documento o ID del miembro es obligatorio.');
  }

  const result = await attendanceService.checkIn(
    resolvedDoc,
    Boolean(body.override),
    body.overrideReason,
    body.registeredBy || 'Recepción'
  );

  if (body.override && result.success) {
    await auditService.log(
      'OVERRIDE_CHECKIN',
      'Attendance',
      result.attendance?.id,
      `Ingreso excepcional autorizado para documento ${resolvedDoc}. Motivo: ${body.overrideReason || 'Autorizado en recepción'}`,
      body.registeredBy || 'Recepción'
    );
  }

  if (result.blocked) return res.status(403).json(result);
  if (!result.success) return res.status(409).json(result);

  res.json(result);
});

// GET /api/attendance/today - Asistencias registradas hoy
attendanceRouter.get('/today', async (_req, res) => {
  res.json(await attendanceService.getTodayAttendances());
});

// GET /api/attendance/history/:clientId - Historial de un cliente
attendanceRouter.get('/history/:clientId', async (req, res) => {
  const { clientId } = parse(historyParamsSchema, req.params);
  res.json(await attendanceService.getClientHistory(clientId));
});
