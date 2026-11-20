import { useEffect, useRef, useState } from 'react';
import { SORT_OPTIONS } from '../../hooks/useCatalogParams.js';
import styles from './FiltersPanel.module.css';

const SEARCH_DEBOUNCE_MS = 400;

function SearchBox({ value, onSearch }) {
  const [text, setText] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setText(value);
  }

  function handleChange(event) {
    const next = event.target.value;
    setText(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(next.trim()), SEARCH_DEBOUNCE_MS);
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearTimeout(timerRef.current);
    onSearch(text.trim());
  }

  return (
    <form className={styles.search} role="search" onSubmit={handleSubmit}>
      <label htmlFor="filter-q" className={styles.label}>Поиск по названию</label>
      <div className={styles.searchRow}>
        <input
          id="filter-q"
          type="search"
          value={text}
          maxLength={100}
          placeholder="Например, «искусство»"
          autoComplete="off"
          onChange={handleChange}
        />
        <button type="submit" className="button button-primary">Найти</button>
      </div>
    </form>
  );
}

function CityFilter({ cities, cityId, onChange }) {
  const selectedName = cities.find((c) => String(c.id) === cityId)?.name ?? '';
  const [text, setText] = useState(selectedName);
  const [previousName, setPreviousName] = useState(selectedName);
  if (selectedName !== previousName) {
    setPreviousName(selectedName);
    setText(selectedName);
  }

  function handleChange(event) {
    const next = event.target.value;
    setText(next);
    const match = cities.find((c) => c.name.toLowerCase() === next.trim().toLowerCase());
    if (match) onChange(String(match.id));
    else if (next === '') onChange('');
  }

  return (
    <div className={styles.field}>
      <label htmlFor="filter-city" className={styles.label}>Город</label>
      <input
        id="filter-city"
        list="city-options"
        value={text}
        placeholder="Любой город"
        autoComplete="off"
        onChange={handleChange}
      />
      <datalist id="city-options">
        {cities.map((city) => (
          <option key={city.id} value={city.name} />
        ))}
      </datalist>
    </div>
  );
}

export function FiltersPanel({ params, categories, cities, hasActiveFilters, onChange, onReset }) {
  return (
    <section className={styles.panel} aria-label="Поиск и фильтры">
      <SearchBox value={params.q} onSearch={(q) => onChange({ q })} />

      <div className={styles.grid}>
        <CityFilter cities={cities} cityId={params.cityId} onChange={(cityId) => onChange({ cityId })} />

        <div className={styles.field}>
          <label htmlFor="filter-category" className={styles.label}>Категория</label>
          <select
            id="filter-category"
            value={params.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="filter-from" className={styles.label}>Дата с</label>
          <input id="filter-from" type="date" value={params.dateFrom} max={params.dateTo || undefined}
            onChange={(e) => onChange({ dateFrom: e.target.value })} />
        </div>

        <div className={styles.field}>
          <label htmlFor="filter-to" className={styles.label}>Дата по</label>
          <input id="filter-to" type="date" value={params.dateTo} min={params.dateFrom || undefined}
            onChange={(e) => onChange({ dateTo: e.target.value })} />
        </div>

        <div className={styles.field}>
          <label htmlFor="filter-sort" className={styles.label}>Сортировка</label>
          <select id="filter-sort" value={params.sortValue} onChange={(e) => onChange({ sort: e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.footer}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            role="switch"
            checked={params.includePast}
            onChange={(e) => onChange({ includePast: e.target.checked })}
          />
          <span className={styles.track} aria-hidden="true" />
          Показать завершённые
        </label>
        <button type="button" className="button" onClick={onReset} disabled={!hasActiveFilters}>
          Сбросить фильтры
        </button>
      </div>
    </section>
  );
}
