import { Router } from 'express';
import { attendanceService } from '../services/attendanceService.js';
import { clientService } from '../services/clientService.js';
import { auditService } from '../services/auditService.js';

export const attendanceRouter = Router();

// GET /api/attendance - Listar asistencias (todas o filtradas por fecha)
attendanceRouter.get('/', async (req, res) => {
  try {
    const list = await attendanceService.listAttendances(req.query.date as string | undefined);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo cargar la lista de asistencias.' });
    console.error('[ATTENDANCE] list:', err.message);
  }
});

// POST /api/attendance/check-in - Marcaje de asistencia con bloqueo de vencidos (DP-003)
attendanceRouter.post('/check-in', async (req, res) => {
  try {
    const { documentId, clientId, override, overrideReason, registeredBy } = req.body;
    let resolvedDoc = typeof documentId === 'string' ? documentId.trim() : '';

    if (!resolvedDoc && clientId) {
      const client = await clientService.getById(String(clientId));
      if (!client) {
        return res.status(404).json({ error: 'Miembro no encontrado.' });
      }
      resolvedDoc = client.document_id;
    }

    if (!resolvedDoc || resolvedDoc.length < 3) {
      return res.status(400).json({ error: 'El número de documento o ID del miembro es obligatorio.' });
    }

    const result = await attendanceService.checkIn(
      resolvedDoc,
      Boolean(override),
      overrideReason,
      registeredBy || 'Recepción'
    );

    if (override && result.success) {
      await auditService.log(
        'OVERRIDE_CHECKIN',
        'Attendance',
        result.attendance?.id,
        `Ingreso excepcional autorizado para documento ${resolvedDoc}. Motivo: ${overrideReason || 'Autorizado en recepción'}`,
        registeredBy || 'Recepción'
      );
    }

    if (result.blocked) {
      return res.status(403).json(result);
    }

    if (!result.success) {
      return res.status(409).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo registrar la asistencia.' });
    console.error('[ATTENDANCE] check-in:', err.message);
  }
});

// GET /api/attendance/today - Asistencias registradas hoy
attendanceRouter.get('/today', async (_req, res) => {
  try {
    const list = await attendanceService.getTodayAttendances();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudieron cargar las asistencias de hoy.' });
    console.error('[ATTENDANCE] today:', err.message);
  }
});

// GET /api/attendance/history/:clientId - Historial de un cliente
attendanceRouter.get('/history/:clientId', async (req, res) => {
  try {
    const list = await attendanceService.getClientHistory(req.params.clientId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo cargar el historial.' });
    console.error('[ATTENDANCE] history:', err.message);
  }
});
