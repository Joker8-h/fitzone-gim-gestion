import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { auditService } from '../services/auditService.js';

export const dashboardRouter = Router();

// GET /api/dashboard/metrics - KPIs en tiempo real para el panel
dashboardRouter.get('/metrics', async (_req, res) => {
  res.json(await dashboardService.getMetrics());
});

// GET /api/dashboard/audit-logs - Bitácora de seguridad y excepciones
dashboardRouter.get('/audit-logs', async (_req, res) => {
  res.json(await auditService.getRecentLogs(100));
});
