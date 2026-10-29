import { Router } from 'express';
import { baileysManager } from '../services/baileysService.js';
import { aiTrackingService } from '../services/aiTrackingService.js';

export const whatsappRouter = Router();

// GET /api/whatsapp/status - Estado de conexión y código QR en base64
whatsappRouter.get('/status', (req, res) => {
  try {
    const status = baileysManager.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/connect - Iniciar socket de WhatsApp / generar nuevo QR
whatsappRouter.post('/connect', async (req, res) => {
  try {
    await baileysManager.init();
    res.json({ message: 'Iniciando conexión de WhatsApp...', ...baileysManager.getStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect - Cerrar sesión y desvincular
whatsappRouter.post('/disconnect', async (req, res) => {
  try {
    await baileysManager.disconnect();
    res.json({ message: 'Sesión de WhatsApp cerrada exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/rules - Listar reglas de seguimiento
whatsappRouter.get('/rules', (req, res) => {
  try {
    const rules = aiTrackingService.getRules();
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/whatsapp/rules/:ruleType - Actualizar umbrales y plantillas
whatsappRouter.put('/rules/:ruleType', (req, res) => {
  try {
    const { thresholdDays, isEnabled, messageTemplate } = req.body;
    const updated = aiTrackingService.updateRule(req.params.ruleType, {
      thresholdDays: thresholdDays !== undefined ? Number(thresholdDays) : undefined,
      isEnabled,
      messageTemplate,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/whatsapp/candidates - Obtener clientes inactivos o por vencer con mensaje sugerido por IA
whatsappRouter.get('/candidates', async (req, res) => {
  try {
    const candidates = await aiTrackingService.getCandidates();
    res.json(candidates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send - Enviar mensaje individual
whatsappRouter.post('/send', async (req, res) => {
  try {
    const { clientId, ruleType, message } = req.body;
    if (!clientId || !message) {
      return res.status(400).json({ error: 'Cliente y mensaje son obligatorios' });
    }

    await aiTrackingService.sendCommunication(clientId, ruleType || 'MANUAL', message);
    res.json({ success: true, message: 'Mensaje enviado exitosamente vía WhatsApp' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/logs - Historial de mensajes enviados
whatsappRouter.get('/logs', (req, res) => {
  try {
    const logs = aiTrackingService.getLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
