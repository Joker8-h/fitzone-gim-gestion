import { Router } from 'express';
import { z } from 'zod';
import { baileysManager } from '../services/baileysService.js';
import { aiTrackingService } from '../services/aiTrackingService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';

export const whatsappRouter = Router();

// --- Schemas Zod (D7) ---

const ruleTypeSchema = z.object({ ruleType: z.string().min(1) });

const updateRuleSchema = z.object({
  thresholdDays: z.coerce.number().int().positive().optional(),
  isEnabled: z.boolean().optional(),
  messageTemplate: z.string().trim().optional(),
});

const sendMessageSchema = z.object({
  clientId: z.string({ error: 'Cliente y mensaje son obligatorios' }).min(1, 'Cliente y mensaje son obligatorios'),
  ruleType: z.string().trim().optional(),
  message: z.string({ error: 'Cliente y mensaje son obligatorios' }).min(1, 'Cliente y mensaje son obligatorios'),
});

// GET /api/whatsapp/status - Estado de conexión y código QR en base64
whatsappRouter.get('/status', (_req, res) => {
  res.json(baileysManager.getStatus());
});

// POST /api/whatsapp/connect - Iniciar socket de WhatsApp / generar nuevo QR
whatsappRouter.post('/connect', async (_req, res) => {
  await baileysManager.init();
  res.json({ message: 'Iniciando conexión de WhatsApp...', ...baileysManager.getStatus() });
});

// POST /api/whatsapp/disconnect - Cerrar sesión y desvincular
whatsappRouter.post('/disconnect', async (_req, res) => {
  await baileysManager.disconnect();
  res.json({ message: 'Sesión de WhatsApp cerrada exitosamente' });
});

// GET /api/whatsapp/rules - Listar reglas de seguimiento
whatsappRouter.get('/rules', async (_req, res) => {
  res.json(await aiTrackingService.getRules());
});

// PUT /api/whatsapp/rules/:ruleType - Actualizar umbrales y plantillas
whatsappRouter.put('/rules/:ruleType', async (req, res) => {
  const { ruleType } = parse(ruleTypeSchema, req.params);
  const data = parse(updateRuleSchema, req.body);
  res.json(await aiTrackingService.updateRule(ruleType, data));
});

// GET /api/whatsapp/candidates - Obtener clientes inactivos o por vencer con mensaje sugerido por IA
whatsappRouter.get('/candidates', async (_req, res) => {
  res.json(await aiTrackingService.getCandidates());
});

// POST /api/whatsapp/send - Enviar mensaje individual
whatsappRouter.post('/send', async (req, res) => {
  const { clientId, ruleType, message } = parse(sendMessageSchema, req.body);
  await aiTrackingService.sendCommunication(clientId, ruleType || 'MANUAL', message);
  res.json({ success: true, message: 'Mensaje procesado exitosamente' });
});

// POST /api/whatsapp/run-automated - Barrido automático IA para todos los candidatos (solo ADMIN)
whatsappRouter.post('/run-automated', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  res.json(await aiTrackingService.runAutomatedSweep());
});

// GET /api/whatsapp/logs - Historial de mensajes enviados
whatsappRouter.get('/logs', async (_req, res) => {
  res.json(await aiTrackingService.getLogs());
});
