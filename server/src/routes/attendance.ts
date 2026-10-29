import { Router } from 'express';
import { attendanceService } from '../services/attendanceService.js';
import { auditService } from '../services/auditService.js';

export const attendanceRouter = Router();

// POST /api/attendance/check-in - Marcaje de asistencia con bloqueo de vencidos (DP-003)
attendanceRouter.post('/check-in', (req, res) => {
  try {
    const { documentId, override, overrideReason, registeredBy } = req.body;
    if (!documentId || typeof documentId !== 'string') {
      return res.status(400).json({ error: 'El número de documento es obligatorio.' });
    }

    const cleanDoc = documentId.trim();
    if (cleanDoc.length < 3) {
      return res.status(400).json({ error: 'Documento inválido.' });
    }

    const result = attendanceService.checkIn(
      cleanDoc,
      Boolean(override),
      overrideReason,
      registeredBy || 'Recepción'
    );

    // Auditoría si hubo excepción autorizada (RN-008, RNF-006)
    if (override && result.success) {
      auditService.log(
        'OVERRIDE_CHECKIN',
        'Attendance',
        result.attendance?.id,
        `Ingreso excepcional autorizado para documento ${cleanDoc}. Motivo: ${overrideReason || 'Sin motivo especificado'}`,
        registeredBy || 'Recepción'
      );
    }

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
