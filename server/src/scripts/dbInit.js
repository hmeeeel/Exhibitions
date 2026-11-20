import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { closePool, pool } from '../config/db.js';

const schemaPath = fileURLToPath(new URL('../../db/schema.sql', import.meta.url));

try {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Схема БД применена: db/schema.sql');
} catch (error) {
  console.error('Не удалось применить схему БД:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
