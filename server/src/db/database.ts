import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no está definida. Configúrala en .env (postgreSQL de Railway o local). Ejemplo: postgresql://user:pass@host:5432/fitzone'
  );
}

// Pool de conexiones PostgreSQL (reemplaza al DatabaseSync de node:sqlite)
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error({ err }, '[DB] Error inesperado en el pool PostgreSQL');
});

// Conviierte placeholders posicionales '?' de SQLite a los $1..$n de PostgreSQL.
// Las preguntas dentro de literales de string SQL no existen en este código base.
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// SELECT: devuelve todas las filas
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(toPgPlaceholders(sql), params);
  return res.rows as T[];
}

// SELECT: devuelve la primera fila o null
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const res = await pool.query(toPgPlaceholders(sql), params);
  return (res.rows[0] as T) ?? null;
}

// INSERT/UPDATE/DELETE: devuelve el número de filas afectadas
export async function run(sql: string, params: any[] = []): Promise<number> {
  const res = await pool.query(toPgPlaceholders(sql), params);
  return res.rowCount ?? 0;
}

// Ejecuta sentencias sin parámetros (DDL, múltiples statements)
export async function exec(sql: string): Promise<void> {
  await pool.query(sql);
}

// Ejecuta una función dentro de una transacción con un cliente dedicado.
// Uso: await withTransaction(async (tx) => { await tx.query('INSERT ...') })
export async function withTransaction<T>(
  fn: (tx: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

let initialized = false;

export async function initDatabase(): Promise<void> {
  if (initialized) return;

  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
    path.join(process.cwd(), 'server', 'src', 'db', 'schema.sql'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const schemaSql = fs.readFileSync(candidate, 'utf-8');
      await pool.query(schemaSql);
      break;
    }
  }

  initialized = true;
  logger.info('[DB] Esquema PostgreSQL aplicado correctamente.');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
