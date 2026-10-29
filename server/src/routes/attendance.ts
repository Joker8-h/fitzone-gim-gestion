import { Router } from 'express';
import { attendanceService } from '../services/attendanceService.js';

export const attendanceRouter = Router();

// POST /api/attendance/check-in - Marcaje de asistencia con bloqueo de vencidos (DP-003)
attendanceRouter.post('/check-in', (req, res) => {
  try {
    const { documentId, override, overrideReason, registeredBy } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'El número de documento es obligatorio' });
    }

    const result = attendanceService.checkIn(
      documentId,
      Boolean(override),
      overrideReason,
      registeredBy
    );

    if (result.blocked) {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/today - Asistencias registradas hoy
attendanceRouter.get('/today', (req, res) => {
  try {
    const list = attendanceService.getTodayAttendances();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/history/:clientId - Historial de un cliente
attendanceRouter.get('/history/:clientId', (req, res) => {
  try {
    const list = attendanceService.getClientHistory(req.params.clientId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
