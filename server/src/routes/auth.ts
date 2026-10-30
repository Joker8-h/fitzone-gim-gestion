import { Router } from 'express';
import { authService, verifyToken } from '../services/authService.js';
import { rateLimiter } from '../middleware/security.js';

export const authRouter = Router();

function extractToken(req: any): string | null {
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

// POST /api/auth/login - Iniciar sesión con rate limiting estricto anti-fuerza bruta
authRouter.post(
  '/login',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
  }),
  (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Debes ingresar tu usuario/correo y contraseña.' });
      }

      const { token, user } = authService.login(String(username), String(password));

      res.setHeader(
        'Set-Cookie',
        `fitzone_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
      );

      res.json({ token, user });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }
);

// POST /api/auth/logout - Cerrar sesión
authRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'fitzone_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

// GET /api/auth/me - Verificar sesión actual
authRouter.get('/me', (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
  res.json({ user });
});

// GET /api/auth/users - Listar usuarios del sistema
authRouter.get('/users', (_req, res) => {
  try {
    res.json(authService.listUsers());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users - Crear nuevo usuario con contraseña para ingresar al sistema
authRouter.post('/users', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, usuario/correo y contraseña son obligatorios.' });
    }
    const created = authService.createUser({ name, email, password, role });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id - Eliminar usuario
authRouter.delete('/users/:id', (req, res) => {
  try {
    res.json(authService.deleteUser(req.params.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
