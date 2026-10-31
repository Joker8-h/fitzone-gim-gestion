import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { auditService } from '../services/auditService.js';

export const dashboardRouter = Router();

// GET /api/dashboard/metrics - KPIs en tiempo real para el panel
dashboardRouter.get('/metrics', async (_req, res) => {
  try {
    const metrics = await dashboardService.getMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudieron cargar las métricas del panel.' });
    console.error('[DASHBOARD] metrics:', err.message);
  }
});

// GET /api/dashboard/audit-logs - Bitácora de seguridad y excepciones
dashboardRouter.get('/audit-logs', async (_req, res) => {
  try {
    const logs = await auditService.getRecentLogs(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo cargar la bitácora de auditoría.' });
    console.error('[DASHBOARD] audit-logs:', err.message);
  }
});
