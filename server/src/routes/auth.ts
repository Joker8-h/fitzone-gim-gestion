import { Router } from 'express';
import { authService } from '../services/authService.js';
import { rateLimiter } from '../middleware/security.js';
import { requireAuth, requireRole, extractToken } from '../middleware/auth.js';
import { verifyToken } from '../services/authService.js';

export const authRouter = Router();

const isProduction = process.env.NODE_ENV === 'production';
const cookieAttrs = `HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${isProduction ? '; Secure' : ''}`;

// POST /api/auth/login - Iniciar sesión con rate limiting estricto anti-fuerza bruta
authRouter.post(
  '/login',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
  }),
  (async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Debes ingresar tu usuario/correo y contraseña.' });
      }

      const { token, user } = await authService.login(String(username), String(password));

      // La sesión viaja SOLO en cookie HttpOnly (nunca en el body de la respuesta)
      res.setHeader('Set-Cookie', `fitzone_token=${encodeURIComponent(token)}; ${cookieAttrs}`);

      res.json({ user });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  })
);

// POST /api/auth/logout - Cerrar sesión
authRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `fitzone_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? '; Secure' : ''}`);
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

// Gestión de usuarios del sistema: solo ADMIN
authRouter.get('/users', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  try {
    res.json(await authService.listUsers());
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudieron listar los usuarios.' });
    console.error('[AUTH] listUsers:', err.message);
  }
});

// POST /api/auth/users - Crear nuevo usuario con contraseña para ingresar al sistema
authRouter.post('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, usuario/correo y contraseña son obligatorios.' });
    }
    const created = await authService.createUser({ name, email, password, role });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id - Eliminar usuario
authRouter.delete('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    res.json(await authService.deleteUser(req.params.id as string));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
