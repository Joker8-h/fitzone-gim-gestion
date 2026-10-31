import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { runSeed } from './db/seed.js';

import { securityHeaders, rateLimiter, sanitizeInputs } from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';

import { clientRouter } from './routes/clients.js';
import { membershipRouter } from './routes/memberships.js';
import { attendanceRouter } from './routes/attendance.js';
import { financeRouter } from './routes/finances.js';
import { dashboardRouter } from './routes/dashboard.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { operationsRouter } from './routes/operations.js';
import { authRouter } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Detrás del proxy de Railway/NGINX confiar en X-Forwarded-For para
// que el rate limiting y la auditoría usen la IP real del cliente
app.set('trust proxy', 1);

// 1. Cabeceras de seguridad estrictas
app.use(securityHeaders);

// 2. CORS restrictivo: solo el origen del propio dominio (o CLIENT_ORIGIN en env)
const configuredOrigin = process.env.CLIENT_ORIGIN;
const allowedOrigins = configuredOrigin
  ? configuredOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origen (mismo dominio, curl, healthchecks)
      if (!origin) return callback(null, true);
      // En desarrollo aceptar el dev server de Vite (localhost:5173)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (process.env.NODE_ENV !== 'production' && isLocalhost) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  })
);

// 3. Límite de tamaño de body para prevenir DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Sanitización profunda de entradas
app.use(sanitizeInputs);

// 5. Rate limiting global (120 peticiones / minuto por IP)
app.use(rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Demasiadas solicitudes desde esta IP. Por favor espera un minuto.'
}));

// Servir frontend estático siempre fresco
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

// API Routes: todas requieren sesión (el router de auth gestiona sus rutas
// públicas de login/logout/me internamente)
app.use('/api/auth', authRouter);
app.use('/api/clients', requireAuth, clientRouter);
app.use('/api/memberships', requireAuth, membershipRouter);
app.use('/api/attendance', requireAuth, attendanceRouter);
app.use('/api/finances', requireAuth, financeRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/whatsapp', requireAuth, whatsappRouter);
app.use('/api/operations', requireAuth, operationsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    security: 'hardened',
    timestamp: new Date().toISOString(),
    service: 'GIM API Server - Fase 1'
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Arranque asíncrono: esquema + seed antes de aceptar tráfico
async function bootstrap(): Promise<void> {
  await initDatabase();
  await runSeed();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  FITZONE — Servidor Seguro y Endurecido (Fase 2)`);
    console.log(`  Base de datos: PostgreSQL`);
    console.log(`  Acceso Web: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch((err) => {
  console.error('[BOOT] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
