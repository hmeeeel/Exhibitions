import { query } from '../../config/db.js';

export async function findAll() {
  const { rows } = await query('SELECT id, name FROM categories ORDER BY lower(name), id');
  return rows;
}
