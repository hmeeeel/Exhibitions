import { query } from '../../config/db.js';
import { camelizeRow } from '../../utils/camelCase.js';

export async function findAll({ withExhibitions }) {
  const { rows } = await query(
    `SELECT c.id, c.name, c.lat, c.lng
       FROM cities c
      WHERE NOT $1::boolean
         OR EXISTS (SELECT 1 FROM exhibitions e WHERE e.city_id = c.id)
      ORDER BY lower(c.name), c.id`,
    [withExhibitions],
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query(
    'SELECT id, name, lat, lng, boundary FROM cities WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

// ---------- Используется скриптом импорта (src/import) ----------

export async function findAllForImport(client) {
  const { rows } = await client.query('SELECT id, name, wikidata_id FROM cities');
  return rows.map(camelizeRow);
}

/**
 * Добавляет город или обновляет существующий по wikidata_id.
 * Контур не затирается, если новый импорт его не получил.
 * Возвращает true, если запись добавлена, и false, если обновлена.
 */
export async function upsertCity(client, city) {
  const { rows } = await client.query(
    `INSERT INTO cities (name, wikidata_id, lat, lng, boundary)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (wikidata_id) DO UPDATE
        SET name     = EXCLUDED.name,
            lat      = EXCLUDED.lat,
            lng      = EXCLUDED.lng,
            boundary = COALESCE(EXCLUDED.boundary, cities.boundary)
     RETURNING (xmax = 0) AS inserted`,
    [city.name, city.wikidataId, city.lat, city.lng, city.boundary ? JSON.stringify(city.boundary) : null],
  );
  return rows[0].inserted;
}

/** Контрольные показатели таблицы cities после импорта. */
export async function collectImportReport(client) {
  const { rows } = await client.query(
    `SELECT
       count(*)::int                                          AS total,
       count(*) FILTER (WHERE boundary IS NULL)::int          AS without_boundary,
       count(*) FILTER (WHERE wikidata_id IS NULL)::int       AS without_wikidata_id,
       count(*) FILTER (WHERE lat NOT BETWEEN 51.2 AND 56.2
                           OR lng NOT BETWEEN 23.1 AND 32.8)::int AS outside_belarus_bbox,
       (SELECT count(*)::int FROM (
          SELECT lower(name) FROM cities GROUP BY lower(name) HAVING count(*) > 1) d) AS duplicate_names
     FROM cities`,
  );
  return camelizeRow(rows[0]);
}
