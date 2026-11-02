import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { rateLimiter } from '../middleware/security.js';
import { requireAuth, requireRole, extractToken } from '../middleware/auth.js';
import { verifyToken } from '../services/authService.js';
import { parse } from '../middleware/validate.js';

export const authRouter = Router();

const isProduction = process.env.NODE_ENV === 'production';
const cookieAttrs = `HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${isProduction ? '; Secure' : ''}`;

// --- Schemas Zod (D7) ---

const loginSchema = z.object({
  username: z
    .string({ error: 'Debes ingresar tu usuario/correo y contraseña.' })
    .trim()
    .min(1, 'Debes ingresar tu usuario/correo y contraseña.'),
  password: z
    .string({ error: 'Debes ingresar tu usuario/correo y contraseña.' })
    .min(1, 'Debes ingresar tu usuario/correo y contraseña.'),
});

const createUserSchema = z.object({
  name: z.string({ error: 'Nombre, usuario/correo y contraseña son obligatorios.' }).trim().min(1, 'Nombre, usuario/correo y contraseña son obligatorios.'),
  email: z.string({ error: 'Nombre, usuario/correo y contraseña son obligatorios.' }).trim().min(1, 'Nombre, usuario/correo y contraseña son obligatorios.'),
  password: z.string({ error: 'Nombre, usuario/correo y contraseña son obligatorios.' }).min(1, 'Nombre, usuario/correo y contraseña son obligatorios.'),
  role: z.string().trim().optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

// POST /api/auth/login - Iniciar sesión con rate limiting estricto anti-fuerza bruta
authRouter.post(
  '/login',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
  }),
  async (req, res) => {
    const { username, password } = parse(loginSchema, req.body);

    const { token, user } = await authService.login(username, password);

    // La sesión viaja SOLO en cookie HttpOnly (nunca en el body de la respuesta)
    res.setHeader('Set-Cookie', `fitzone_token=${encodeURIComponent(token)}; ${cookieAttrs}`);

    res.json({ user });
  }
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
  res.json(await authService.listUsers());
});

// POST /api/auth/users - Crear nuevo usuario con contraseña para ingresar al sistema
authRouter.post('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const data = parse(createUserSchema, req.body);
  res.status(201).json(await authService.createUser(data));
});

// DELETE /api/auth/users/:id - Eliminar usuario
authRouter.delete('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  res.json(await authService.deleteUser(id));
});
