import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { ApiError } from '../errors.js';

// Middleware central de errores (Fase 2 — D6).
// - ZodError (D7)        -> 400 con detalle por campo (solo mensajes de negocio).
// - ApiError             -> status + mensaje expuesto por el servicio.
// - Errores 4xx de Express (body-parser, etc.) -> status + mensaje.
// - Cualquier otro       -> 500 genérico; el detalle va al log, NUNCA al cliente.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1. Errores de validación Zod
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.') || '(raíz)',
      message: issue.message,
    }));
    res.status(400).json({
      error: details.map((d) => `${d.path}: ${d.message}`).join(' | '),
      details,
    });
    return;
  }

  // 2. Errores de aplicación esperados (mensajes seguros para el cliente)
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // 3. Errores HTTP generados por middlewares de Express (body-parser, etc.)
  const anyErr = err as { status?: number; statusCode?: number; type?: string; message?: string };
  const status = Number(anyErr.status || anyErr.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const message =
      anyErr.type === 'entity.parse.failed'
        ? 'El cuerpo de la solicitud no es JSON válido.'
        : anyErr.message || 'Solicitud inválida.';
    res.status(status).json({ error: message });
    return;
  }

  // 4. Error inesperado: log completo en el servidor, respuesta genérica al cliente
  logger.error(
    { err, method: req.method, url: req.originalUrl },
    'Error no controlado en el servidor'
  );
  res.status(500).json({ error: 'Error interno del servidor. Intenta nuevamente.' });
};
