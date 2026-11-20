import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePoint, parseWikidataId, parseCityBindings } from '../src/import/parseCities.js';

const row = (id, name, coord, extra = {}) => ({
  city: { value: `http://www.wikidata.org/entity/${id}` },
  cityLabel: { value: name },
  coord: { value: coord },
  ...extra,
});

test('parseWikidataId извлекает Q-идентификатор', () => {
  assert.equal(parseWikidataId('http://www.wikidata.org/entity/Q2280'), 'Q2280');
  assert.equal(parseWikidataId('нет'), null);
});

test('parsePoint: WKT (долгота, широта) -> { lat, lng } с округлением', () => {
  assert.deepEqual(parsePoint('Point(27.5615123456 53.9045)'), { lat: 53.9045, lng: 27.561512 });
  assert.equal(parsePoint('Point(200 10)'), null);
  assert.equal(parsePoint('мусор'), null);
});

test('parseCityBindings: фильтрует некорректное и убирает дубликаты', () => {
  const { cities, stats } = parseCityBindings([
    row('Q2280', 'Минск', 'Point(27.56 53.9)', { geoshape: { value: 'http://commons.wikimedia.org/data/main/Data:Minsk.map' } }),
    row('Q2280', 'Минск', 'Point(27.56 53.9)'),           // повтор id
    row('Q999', 'минск', 'Point(1 2)'),                    // повтор названия (без учёта регистра)
    row('Q3', 'Q3', 'Point(27 53)'),                       // нет русского названия
    row('Q4', 'Брест', 'Point(300 53)'),                   // некорректные координаты
    row('Q2292', 'Брест', 'Point(23.68 52.09)'),
  ]);
  assert.deepEqual(cities.map((c) => c.wikidataId), ['Q2280', 'Q2292']);
  assert.equal(cities[0].geoshapeUrl, 'http://commons.wikimedia.org/data/main/Data:Minsk.map');
  assert.equal(cities[1].geoshapeUrl, null);
  assert.deepEqual(stats, { received: 6, invalid: 2, duplicateIds: 1, duplicateNames: 1 });
});
