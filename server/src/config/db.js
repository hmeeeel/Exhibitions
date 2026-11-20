import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value); // 'YYYY-MM-DD'
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
  connectionTimeoutMillis: 5000,
});


pool.on('error', (error) => logger.error({ err: error }, 'Ошибка соединения с PostgreSQL'));

export function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

export function closePool() {
  return pool.end();
}
