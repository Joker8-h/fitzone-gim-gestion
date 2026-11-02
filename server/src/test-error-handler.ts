// Verificación puntual de D6: el errorHandler NO filtra mensajes internos.
// Corre contra una mini-app express aislada (no toca el server real ni la BD).
import express from 'express';
import 'express-async-errors';
import { errorHandler } from './middleware/errorHandler.js';
import { badRequest, notFound, ApiError } from './errors.js';
import { z } from 'zod';
import './zodConfig.js';

const app = express();
app.use(express.json());

app.get('/boom', () => {
  // Error interno con mensaje que NUNCA debe llegar al cliente
  throw new Error('FALLO INTERNO SECRETO: credenciales de la BD en /ruta/secreta');
});

app.get('/api-error', () => {
  throw notFound('Recurso de negocio no encontrado');
});
app.get('/bad-request', () => {
  throw badRequest('Dato inválido de negocio');
});
app.get('/api-error-class', () => {
  throw new ApiError(409, 'Conflicto de negocio');
});
app.get('/async-boom', async () => {
  await Promise.resolve();
  throw new Error('ERROR ASINCRONO SECRETO: stack interno');
});
app.get('/zod', () => {
  z.object({ a: z.string().min(3) }).parse({});
});

app.use(errorHandler);

const server = app.listen(0, async () => {
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;
  let pass = 0;
  let fail = 0;
  const check = (name: string, cond: boolean, extra = '') => {
    if (cond) { pass++; console.log(`[PASO] ${name}`); }
    else { fail++; console.log(`[FALLO] ${name} ${extra}`); }
  };

  const get = async (path: string) => {
    const r = await fetch(base + path);
    const text = await r.text();
    return { status: r.status, text };
  };

  let r = await get('/boom');
  check('500 generico sin mensaje interno', r.status === 500 && !r.text.includes('SECRETO') && !r.text.includes('secreta'), r.text);
  check('500 tiene mensaje generico', r.text.includes('Error interno del servidor'), r.text);

  r = await get('/async-boom');
  check('500 async sin mensaje interno', r.status === 500 && !r.text.includes('SECRETO'), r.text);

  r = await get('/api-error');
  check('ApiError 404 expone su mensaje', r.status === 404 && r.text.includes('Recurso de negocio'), r.text);

  r = await get('/bad-request');
  check('ApiError 400 expone su mensaje', r.status === 400 && r.text.includes('Dato inválido'), r.text);

  r = await get('/api-error-class');
  check('ApiError 409 expone su mensaje', r.status === 409 && r.text.includes('Conflicto'), r.text);

  r = await get('/zod');
  check('ZodError -> 400 con detalle en español', r.status === 400 && r.text.includes('details') && r.text.includes('texto'), r.text);

  console.log(`\nRESULTADOS: ${pass} pruebas superadas, ${fail} fallos.`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
});
