import 'dotenv/config';
import { initDatabase } from './db/database.js';
import { runSeed } from './db/seed.js';
import { logger } from './logger.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 3001;
const app = createApp();

// Arranque asíncrono: esquema + seed antes de aceptar tráfico
async function bootstrap(): Promise<void> {
  await initDatabase();
  await runSeed();

  app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(
      { port: PORT, db: 'PostgreSQL' },
      'FITZONE — Servidor Seguro y Endurecido (Fase 2) listo'
    );
    logger.info(`Acceso Web: http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, '[BOOT] Error fatal al iniciar el servidor');
  process.exit(1);
});
