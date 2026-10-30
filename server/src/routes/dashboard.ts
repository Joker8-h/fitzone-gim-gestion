import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { auditService } from '../services/auditService.js';

export const dashboardRouter = Router();

// GET /api/dashboard/metrics - KPIs en tiempo real para el panel
dashboardRouter.get('/metrics', (_req, res) => {
  try {
    const metrics = dashboardService.getMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/audit-logs - Bitácora de seguridad y excepciones
dashboardRouter.get('/audit-logs', (_req, res) => {
  try {
    const logs = auditService.getRecentLogs(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
