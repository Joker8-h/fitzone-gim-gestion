import { Request, Response, NextFunction } from 'express';

// 1. Security Headers Middleware (Sin dependencias externas)
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Evitar MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Evitar clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Protección XSS heredada
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Política de referrer segura
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy permitiendo Tailwind CDN y Lucide Icons
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com data: blob:;"
  );
  // Ocultar cabecera de Express
  res.removeHeader('X-Powered-By');
  next();
}

// 2. Rate Limiting en memoria por IP
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Limpiar IPs expiradas periódicamente cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Excluir archivos estáticos de rate limiting
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    record.count++;

    if (record.count > options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      return res.status(429).json({
        error: options.message || 'Demasiadas solicitudes. Por favor espera unos momentos antes de reintentar.',
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// 3. Sanitizador recursivo de cadenas para prevenir inyecciones y XSS
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Quita tags <script>
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = sanitizeValue(val[key]);
    }
    return cleaned;
  }
  return val;
}

export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}
