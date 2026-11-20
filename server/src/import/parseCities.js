// Разбор и нормализация ответа Wikidata. Чистые функции без обращения к сети и БД.

const QID = /Q\d+$/;
const POINT = /^Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i;

const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** 'http://www.wikidata.org/entity/Q2280' -> 'Q2280' */
export function parseWikidataId(uri) {
  const match = typeof uri === 'string' ? uri.match(QID) : null;
  return match ? match[0] : null;
}

/** 'Point(27.56 53.9)' (долгота, широта) -> { lat, lng } с округлением до 6 знаков. */
export function parsePoint(wkt) {
  const match = typeof wkt === 'string' ? wkt.match(POINT) : null;
  if (!match) return null;
  const lng = round6(Number(match[1]));
  const lat = round6(Number(match[2]));
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Преобразует bindings SPARQL в список городов для записи в БД.
 * Правила: одна запись на wikidata_id; при совпадении названий
 * без учёта регистра остаётся первая (самая населённая); записи без русского
 * названия или с некорректными координатами пропускаются.
 */
export function parseCityBindings(bindings) {
  const cities = [];
  const seenIds = new Set();
  const seenNames = new Set();
  const stats = { received: bindings.length, invalid: 0, duplicateIds: 0, duplicateNames: 0 };

  for (const row of bindings) {
    const wikidataId = parseWikidataId(row.city?.value);
    const name = row.cityLabel?.value?.trim();
    const point = parsePoint(row.coord?.value);

    // Метка, совпадающая с идентификатором (Q123), означает отсутствие русского названия
    if (!wikidataId || !name || QID.test(name) || name.length > 80 || !point) {
      stats.invalid += 1;
      continue;
    }
    if (seenIds.has(wikidataId)) {
      stats.duplicateIds += 1;
      continue;
    }
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      stats.duplicateNames += 1;
      continue;
    }
    seenIds.add(wikidataId);
    seenNames.add(nameKey);

    cities.push({
      wikidataId,
      name,
      ...point,
      geoshapeUrl: row.geoshape?.value ?? null,
      boundary: null,
    });
  }
  return { cities, stats };
}
