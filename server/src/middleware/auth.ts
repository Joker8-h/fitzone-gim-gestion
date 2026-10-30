import { Request, RequestHandler } from 'express';
import { verifyToken, AuthUser } from '../services/authService.js';

// Extiende Request con el usuario autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c: string) => c.trim())
      .find((c: string) => c.startsWith('fitzone_token='));
    if (match) {
      return decodeURIComponent(match.split('=')[1]);
    }
  }
  return null;
}

// Exige sesión válida (cookie HttpOnly o Bearer). Adjunta req.user.
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión para continuar.' });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesión expirada o inválida. Inicia sesión de nuevo.' });
  }
  req.user = user;
  next();
};

// Exige uno de los roles permitidos (usar DESPUÉS de requireAuth)
export function requireRole(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Requiere rol: ${roles.join(' o ')}. Tu rol: ${req.user.role}.`,
      });
    }
    next();
  };
}
