import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractBoundary, simplifyLine } from '../src/import/boundary.js';

const square = (x, y, size) => [
  [x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y],
];

test('simplifyLine удаляет точки на прямой и сохраняет углы', () => {
  const line = [[0, 0], [1, 0.00001], [2, 0], [2, 2]];
  assert.deepEqual(simplifyLine(line), [[0, 0], [2, 0], [2, 2]]);
});

test('extractBoundary: Polygon из ответа Commons', () => {
  const json = { data: { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [square(27, 53, 0.1)] } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [27, 53] } },
  ] } };
  const boundary = extractBoundary(json);
  assert.equal(boundary.type, 'Polygon');
  assert.equal(boundary.coordinates[0].length, 5); // 4 вершины + замыкающая
});

test('extractBoundary: несколько полигонов -> MultiPolygon', () => {
  const json = { type: 'MultiPolygon', coordinates: [[square(27, 53, 0.1)], [square(28, 54, 0.1)]] };
  assert.equal(extractBoundary(json).type, 'MultiPolygon');
});

test('extractBoundary: нет полигонов -> null', () => {
  assert.equal(extractBoundary({ data: { type: 'FeatureCollection', features: [] } }), null);
  assert.equal(extractBoundary(null), null);
});
