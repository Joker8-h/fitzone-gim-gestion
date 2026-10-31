// Migración puntual: SQLite (gim.db) -> PostgreSQL (DATABASE_URL)
// Copia SOLO los datos que el seed no recrea idéntico: users y audit_logs.
// Uso: npx tsx src/db/migrate-sqlite.ts [ruta/gim.db]  (lee DATABASE_URL de .env)
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { pool, run } from './database.js';

async function main() {
  const dbPath = process.argv[2] || path.join(process.cwd(), 'gim.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`[MIGRATE] No existe el archivo SQLite: ${dbPath}`);
    process.exit(1);
  }

  const src = new DatabaseSync(dbPath, { readOnly: true });

  // users (solo si aún no existe ese email en Postgres)
  const users = src.prepare('SELECT * FROM users').all() as any[];
  let copiedUsers = 0;
  for (const u of users) {
    const res = await pool.query('SELECT 1 FROM users WHERE email = $1', [u.email]);
    if (res.rowCount === 0) {
      await run(
        `INSERT INTO users (id, name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, u.name, u.email, u.password, u.role, u.created_at, u.updated_at]
      );
      copiedUsers++;
    }
  }

  // audit_logs: agrega solo los que aún no existen por id (los de SQLite tienen UUID únicos)
  const logs = src.prepare('SELECT * FROM audit_logs ORDER BY created_at ASC').all() as any[];
  let copiedLogs = 0;
  for (const l of logs) {
    const res = await pool.query('SELECT 1 FROM audit_logs WHERE id = $1', [l.id]);
    if (res.rowCount === 0) {
      await run(
        `INSERT INTO audit_logs (id, action, entity, entity_id, details, performed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [l.id, l.action, l.entity, l.entity_id, l.details, l.performed_by, l.created_at]
      );
      copiedLogs++;
    }
  }

  src.close();
  await pool.end();
  console.log(`[MIGRATE] users copiados: ${copiedUsers}/${users.length}`);
  console.log(`[MIGRATE] audit_logs copiados: ${copiedLogs}`);
  console.log('[MIGRATE] Listo. Las categorías, reglas y el admin base los genera el seed.');
}

main().catch((err) => {
  console.error('[MIGRATE] Error:', err);
  process.exit(1);
});
