/**
 * Setup global de los tests del server (Fase 2 — D1).
 *
 * SE CARGA ANTES QUE CUALQUIER TEST (vitest `setupFiles`), así que aquí se
 * fija `DATABASE_URL` hacia la BD de prueba ANTES de que `db/database.ts`
 * lea la variable en su ámbito de módulo. Sin esta línea los tests
 * tocarían la BD real: es la garantía que pide el plan.
 */

// 1. Apuntar SIEMPRE a la BD de prueba (nunca a fitzone_dev ni a la de Railway)
const TEST_DB =
  process.env.DATABASE_URL_TEST ||
  'postgresql://postgres:postgres@localhost:5432/fitzone_test';

if (!/test/i.test(TEST_DB)) {
  throw new Error(
    `DATABASE_URL_TEST no parece una BD de prueba: "${TEST_DB}". Los tests no corren contra datos reales.`
  );
}
process.env.DATABASE_URL = TEST_DB;

// Los tests hacen decenas de logins desde la misma IP: sin este flag el
// rate limiting (25 logins / 15 min) devolvería 429 y rompería la suite.
// El propio comportamiento 429 se cubre en rateLimit.test.ts con límite propio.
process.env.NODE_ENV = 'test';

// Contraseña ESTABLE para el admin de prueba (el seed la usa solo si el
// usuario no existe; por eso el setup borra los users antes de seedear).
process.env.ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'FitzoneTest!123';

// 2. Imports dinámicos DESPUÉS de fijar la variable (database.ts la lee al importar)
const { initDatabase, run } = await import('../db/database.js');
const { runSeed } = await import('../db/seed.js');

await initDatabase();

// Los tests crean/borran usuarios: se limpia la tabla para que el admin
// de prueba siempre nazca con ADMIN_INITIAL_PASSWORD conocido.
// (no hay FK hacia `users` en el esquema)
await run('DELETE FROM users');
await runSeed();

/**
 * Deja la BD de prueba limpia de datos de negocio antes de cada suite.
 * Conserva lo que genera el seed: usuarios, categorías y reglas de IA.
 */
export async function resetTestData(): Promise<void> {
  const { run: runSql } = await import('../db/database.js');
  await runSql(`
    TRUNCATE communication_logs, audit_logs, financial_transactions, payments,
      attendances, client_memberships, clients, membership_plans, gym_classes,
      gym_events, employees, equipment CASCADE;
  `);
  await runSeed();
}

/** Credenciales del admin creado por el seed en la BD de prueba. */
export const TEST_ADMIN = {
  username: 'admin@fitzone.com',
  password: 'FitzoneTest!123',
};
