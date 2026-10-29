import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';

export const dashboardRouter = Router();

// GET /api/dashboard/metrics - KPIs en tiempo real para el panel
dashboardRouter.get('/metrics', (req, res) => {
  try {
    const metrics = dashboardService.getMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
