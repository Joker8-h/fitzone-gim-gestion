import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Los tests corren contra la BD de prueba `fitzone_test`, NUNCA contra
    // la BD real: el setup fija DATABASE_URL antes de cargar `db/database.ts`.
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Un worker a secas: los tests comparten la misma BD de prueba y el
    // rate limiting global del server (evita falsos 429 por paralelismo).
    fileParallelism: false,
  },
});
