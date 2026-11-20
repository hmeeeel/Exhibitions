// Импорт городов Беларуси из Wikidata в таблицу cities.
// Запуск: npm run import:cities [-- --no-boundaries]
//   --no-boundaries  не загружать контуры (быстрее; контуры можно догрузить следующим запуском)
// Повторный запуск безопасен: записи обновляются по wikidata_id.
import { pathToFileURL } from 'node:url';
import { closePool, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import * as citiesRepo from '../modules/cities/cities.repo.js';
import { extractBoundary } from './boundary.js';
import { parseCityBindings } from './parseCities.js';
import { fetchCityBindings, fetchGeoshape } from './wikidataClient.js';

const PAUSE_BETWEEN_BOUNDARY_REQUESTS_MS = 250;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function importCities({
  fetchBindings,
  fetchBoundaryJson,
  withBoundaries = true,
  log = console.log,
  pause = sleep,
}) {
  const bindings = await fetchBindings();
  const { cities, stats: parseStats } = parseCityBindings(bindings);
  log(`Получено записей: ${parseStats.received}; подходящих городов: ${cities.length}`);
  log(
    `Пропущено: некорректных ${parseStats.invalid}, повторов id ${parseStats.duplicateIds}, ` +
      `повторов названий ${parseStats.duplicateNames}`,
  );
  if (cities.length === 0) throw new Error('Wikidata не вернула ни одного пригодного города');

  let boundaryFailures = 0;
  if (withBoundaries) {
    const withShape = cities.filter((city) => city.geoshapeUrl);
    log(`Загрузка контуров: ${withShape.length} из ${cities.length}`);
    for (const city of withShape) {
      try {
        city.boundary = extractBoundary(await fetchBoundaryJson(city.geoshapeUrl));
      } catch (error) {
        boundaryFailures += 1;
        log(`  контур «${city.name}» (${city.wikidataId}) не загружен: ${error.message}`);
      }
      await pause(PAUSE_BETWEEN_BOUNDARY_REQUESTS_MS);
    }
  }

  // Вся запись выполняется в одной транзакции: при ошибке таблица не остаётся наполовину обновлённой
  return withTransaction(async (client) => {
    const existing = await citiesRepo.findAllForImport(client);
    const namesTaken = new Map(existing.map((c) => [c.name.toLowerCase(), c.wikidataId]));

    let added = 0;
    let updated = 0;
    let skippedNameConflict = 0;

    for (const city of cities) {
      const owner = namesTaken.get(city.name.toLowerCase());
      const nameBusy = owner !== undefined && owner !== city.wikidataId;
      if (nameBusy) {
        skippedNameConflict += 1;
        log(`  пропущен «${city.name}» (${city.wikidataId}): название занято другой записью`);
        continue;
      }
      if (await citiesRepo.upsertCity(client, city)) added += 1;
      else updated += 1;
    }

    const report = await citiesRepo.collectImportReport(client);
    return { added, updated, skippedNameConflict, boundaryFailures, parse: parseStats, report };
  });
}

function printSummary(result, log = console.log) {
  const { added, updated, skippedNameConflict, boundaryFailures, report } = result;
  log('\nИтог импорта:');
  log(`  добавлено: ${added}, обновлено: ${updated}, пропущено из-за занятого названия: ${skippedNameConflict}`);
  log(`  контуров не загружено из-за ошибок: ${boundaryFailures}`);
  log('Проверка таблицы cities:');
  log(`  всего записей: ${report.total}`);
  log(`  без контура (boundary = NULL): ${report.withoutBoundary}`);
  log(`  дубликаты названий: ${report.duplicateNames}`);
  log(`  координаты вне Беларуси: ${report.outsideBelarusBbox}`);
  if (report.duplicateNames > 0 || report.outsideBelarusBbox > 0) {
    log('  ВНИМАНИЕ: есть записи, требующие ручной проверки');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const userAgent = env.WIKIMEDIA_USER_AGENT;
    if (!userAgent || userAgent.length < 10) {
      throw new Error(
        'Задайте WIKIMEDIA_USER_AGENT в .env: название проекта и контакт (требование Wikimedia)',
      );
    }
    const result = await importCities({
      fetchBindings: () => fetchCityBindings(userAgent),
      fetchBoundaryJson: (url) => fetchGeoshape(url, userAgent),
      withBoundaries: !process.argv.includes('--no-boundaries'),
    });
    printSummary(result);
  } catch (error) {
    console.error('Импорт не выполнен:', error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
