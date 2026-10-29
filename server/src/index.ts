import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { runSeed } from './db/seed.js';

import { securityHeaders, rateLimiter, sanitizeInputs } from './middleware/security.js';

import { clientRouter } from './routes/clients.js';
import { membershipRouter } from './routes/memberships.js';
import { attendanceRouter } from './routes/attendance.js';
import { financeRouter } from './routes/finances.js';
import { dashboardRouter } from './routes/dashboard.js';
import { whatsappRouter } from './routes/whatsapp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar DB y datos por defecto
initDatabase();
runSeed();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Cabeceras de seguridad estrictas
app.use(securityHeaders);

// 2. CORS restrictivo
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

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

// Servir frontend estático optimizado
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, {
  maxAge: '1h',
  etag: true,
}));

// API Routes con rate limiting específico en rutas sensibles
app.use('/api/clients', clientRouter);
app.use('/api/memberships', membershipRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/finances', financeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/whatsapp', whatsappRouter);

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

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🛡️ GIM — Servidor Seguro y Endurecido (Fase 1)`);
  console.log(`  🌐 Acceso Web: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
