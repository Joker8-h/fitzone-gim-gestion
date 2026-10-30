// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'gim.db');

// @ts-ignore
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
    path.join(process.cwd(), 'server', 'src', 'db', 'schema.sql'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const schemaSql = fs.readFileSync(candidate, 'utf-8');
      db.exec(schemaSql);
      break;
    }
  }
  try {
    db.exec('ALTER TABLE clients ADD COLUMN email TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE clients ADD COLUMN avatar_url TEXT;');
  } catch (_) {}
  console.log('[DB] Base de datos SQLite nativa inicializada en:', dbPath);
}
