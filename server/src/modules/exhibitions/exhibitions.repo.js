import { query } from '../../config/db.js';
import { escapeLike } from '../../utils/escapeLike.js';
import { camelizeRow } from '../../utils/camelCase.js';

// Допустимые поля сортировки: в SQL попадает только значение из этого списка
const SORT_COLUMNS = {
  startDate: 'start_date',
  endDate: 'end_date',
  title: 'lower(title)',
  savedCount: 'saved_count',
};

const CARD_COLUMNS = `id, title, category_id, category_name, city_id, city_name, address,
  lat, lng, start_date, end_date, price, image_url, saved_count,
  (end_date < fn_today()) AS is_ended`;

const DETAIL_COLUMNS = `id, title, description, category_id, category_name, city_id, city_name,
  address, lat, lng, start_date, end_date, price, image_url, saved_count,
  created_at, updated_at, (end_date < fn_today()) AS is_ended`;

/** Формирует WHERE и массив параметров по фильтрам каталога. */
function buildWhere(filters, { onlyWithCoordinates = false } = {}) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  // Завершённые выставки скрываются независимо от dateFrom и dateTo
  if (!filters.includePast) conditions.push('end_date >= fn_today()');
  if (filters.q) add('title ILIKE ?', `%${escapeLike(filters.q)}%`);
  if (filters.cityId) add('city_id = ?', filters.cityId);
  if (filters.categoryId) add('category_id = ?', filters.categoryId);
  // Пересечение периодов: start_date <= dateTo AND end_date >= dateFrom
  if (filters.dateFrom) add('end_date >= ?', filters.dateFrom);
  if (filters.dateTo) add('start_date <= ?', filters.dateTo);
  if (onlyWithCoordinates) conditions.push('lat IS NOT NULL AND lng IS NOT NULL');

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export async function findPage(filters) {
  const { where, params } = buildWhere(filters);
  const column = SORT_COLUMNS[filters.sort];
  const direction = filters.order === 'desc' ? 'DESC' : 'ASC';
  const offset = (filters.page - 1) * filters.limit;

  const [countResult, itemsResult] = await Promise.all([
    query(`SELECT count(*)::int AS total FROM v_exhibition_cards ${where}`, params),
    query(
      `SELECT ${CARD_COLUMNS}
         FROM v_exhibition_cards ${where}
        ORDER BY ${column} ${direction}, id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset],
    ),
  ]);

  return { total: countResult.rows[0].total, items: itemsResult.rows.map(camelizeRow) };
}

/** Выставки с координатами для карты. Запрашивается limit + 1 запись, чтобы понять, есть ли остаток. */
export async function findForMap(filters, limit) {
  const { where, params } = buildWhere(filters, { onlyWithCoordinates: true });
  const { rows } = await query(
    `SELECT id, title, city_name, start_date, end_date, image_url, lat, lng,
            (end_date < fn_today()) AS is_ended
       FROM v_exhibition_cards ${where}
      ORDER BY start_date ASC, id ASC
      LIMIT $${params.length + 1}`,
    [...params, limit + 1],
  );
  return rows.map(camelizeRow);
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT ${DETAIL_COLUMNS} FROM v_exhibition_cards WHERE id = $1`,
    [id],
  );
  return rows[0] ? camelizeRow(rows[0]) : null;
}
