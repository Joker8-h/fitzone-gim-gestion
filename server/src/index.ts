import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { runSeed } from './db/seed.js';

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

app.use(cors());
app.use(express.json());

// Servir frontend estático
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/clients', clientRouter);
app.use('/api/memberships', membershipRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/finances', financeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/whatsapp', whatsappRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GIM API Server - Fase 1'
  });
});

// SPA Fallback para navegación de una sola página
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 GIM — Sistema de Gestión para Gimnasio (Fase 1)`);
  console.log(`  🌐 Panel Web: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
