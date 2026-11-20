import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeLike } from '../src/utils/escapeLike.js';
import { listQuery } from '../src/modules/exhibitions/exhibitions.schema.js';

test('escapeLike экранирует спецсимволы ILIKE', () => {
  assert.equal(escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
});

test('listQuery: значения по умолчанию', () => {
  const r = listQuery.parse({});
  assert.deepEqual(r, { includePast: false, sort: 'startDate', order: 'asc', page: 1, limit: 12 });
});

test('listQuery: преобразование типов и отбрасывание неизвестных полей', () => {
  const r = listQuery.parse({ cityId: '3', includePast: 'true', page: '2', q: '  арт ', hack: '1' });
  assert.equal(r.cityId, 3);
  assert.equal(r.includePast, true);
  assert.equal(r.page, 2);
  assert.equal(r.q, 'арт');
  assert.equal('hack' in r, false);
});

test('listQuery: некорректные значения отклоняются', () => {
  for (const bad of [
    { limit: '1000' }, { page: '0' }, { cityId: 'abc' }, { sort: 'password' },
    { dateFrom: '2026-13-40' }, { dateFrom: '2026-12-10', dateTo: '2026-12-01' },
    { includePast: 'yes' }, { q: 'x'.repeat(101) },
  ]) {
    assert.equal(listQuery.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
