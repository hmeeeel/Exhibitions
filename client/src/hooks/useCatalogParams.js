import { useSearchParams } from 'react-router-dom';

export const PAGE_LIMIT = 12;
export const SORT_OPTIONS = [
  { value: 'startDate:asc', label: 'Сначала ближайшие' },
  { value: 'startDate:desc', label: 'Сначала поздние' },
  { value: 'title:asc', label: 'По названию А–Я' },
  { value: 'title:desc', label: 'По названию Я–А' },
  { value: 'savedCount:desc', label: 'Сначала популярные' },
];
const DEFAULT_SORT = 'startDate:asc';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const positiveInt = (value) => (/^[1-9]\d*$/.test(value ?? '') ? value : '');

/**
 * Параметры каталога живут в URL - ссылка воспроизводит поиск,
 * а «назад» в браузере возвращает к предыдущему набору фильтров.
 */
export function useCatalogParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortValue = SORT_OPTIONS.some((o) => o.value === searchParams.get('sort'))
    ? searchParams.get('sort')
    : DEFAULT_SORT;
  const [sort, order] = sortValue.split(':');

  const params = {
    q: searchParams.get('q') ?? '',
    cityId: positiveInt(searchParams.get('cityId')),
    categoryId: positiveInt(searchParams.get('categoryId')),
    dateFrom: DATE.test(searchParams.get('dateFrom') ?? '') ? searchParams.get('dateFrom') : '',
    dateTo: DATE.test(searchParams.get('dateTo') ?? '') ? searchParams.get('dateTo') : '',
    includePast: searchParams.get('includePast') === 'true',
    sortValue,
    sort,
    order,
    page: Number(positiveInt(searchParams.get('page')) || 1),
    view: searchParams.get('view') === 'map' ? 'map' : 'list',
  };

  /** Изменяет часть параметров. Любое изменение фильтров сбрасывает страницу на первую. */
  function update(patch) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(patch)) {
        const isEmpty = value === '' || value === null || value === undefined || value === false;
        const isDefault =
          (key === 'sort' && value === DEFAULT_SORT) ||
          (key === 'page' && value === 1) ||
          (key === 'view' && value === 'list');
        if (isEmpty || isDefault) next.delete(key);
        else next.set(key, String(value));
      }
      if (!('page' in patch) && !('view' in patch)) next.delete('page');
      return next;
    }, { flushSync: true }); // синхронно, чтобы управляемые поля не «мигали» старым значением
  }

  /** «Сбросить фильтры»: очищает всё, кроме режима отображения. */
  function reset() {
    setSearchParams(
      (previous) => (previous.get('view') === 'map' ? new URLSearchParams({ view: 'map' }) : new URLSearchParams()),
      { flushSync: true },
    );
  }

  const filters = {
    q: params.q,
    cityId: params.cityId,
    categoryId: params.categoryId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    includePast: params.includePast ? 'true' : '',
  };
  const hasActiveFilters =
    Boolean(params.q || params.cityId || params.categoryId || params.dateFrom || params.dateTo) ||
    params.includePast;

  return { params, filters, hasActiveFilters, update, reset };
}
