// Добавляет справочник категорий. С флагом --demo добавляет ещё и демонстрационные выставки.
//   npm run db:seed             - только категории
//   npm run db:seed -- --demo   - категории и демонстрационные выставки
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { closePool, pool } from '../config/db.js';

const read = (name) => readFile(fileURLToPath(new URL(`../../db/${name}`, import.meta.url)), 'utf8');

try {
  await pool.query(await read('seed.sql'));
  console.log('Категории добавлены (db/seed.sql)');

  if (process.argv.includes('--demo')) {
    const result = await pool.query(await read('demo.sql'));
    console.log(`Демонстрационные выставки добавлены: ${result.rowCount} (db/demo.sql)`);
    if (result.rowCount === 0) {
      console.log('Ничего не добавлено: нет городов (запустите npm run import:cities) или выставки уже есть.');
    }
  }
} catch (error) {
  console.error('Не удалось добавить данные:', error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
