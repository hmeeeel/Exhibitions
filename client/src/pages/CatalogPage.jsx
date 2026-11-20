import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorMessage } from '../components/StatusMessage.jsx';
import { ExhibitionList } from '../features/catalog/ExhibitionList.jsx';
import { FiltersPanel } from '../features/catalog/FiltersPanel.jsx';
import { ExhibitionsMap } from '../features/map/ExhibitionsMap.jsx';
import {
  useCategoriesQuery,
  useCitiesQuery,
  useCityQuery,
  useExhibitionsQuery,
  useMapExhibitionsQuery,
} from '../hooks/useCatalogQueries.js';
import { useCatalogParams } from '../hooks/useCatalogParams.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { circlePolygon } from '../utils/geo.js';
import styles from './CatalogPage.module.css';

const NO_BOUNDARY_RADIUS_KM = 5;

export function CatalogPage() {
  const navigate = useNavigate();
  const { params, filters, hasActiveFilters, update, reset } = useCatalogParams();

  // От 1200 px список и карта рядом; уже  - один из режимов (view в URL)
  const isWide = useMediaQuery('(min-width: 1200px)');
  const showList = isWide || params.view === 'list';
  const showMap = isWide || params.view === 'map';

  // Состояние выделения хранится в ближайшем общем родителе списка и карты
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const listQuery = useExhibitionsQuery(filters, params);
  const mapQuery = useMapExhibitionsQuery(filters, showMap);
  const categoriesQuery = useCategoriesQuery();
  const citiesQuery = useCitiesQuery();
  const cityQuery = useCityQuery(showMap ? params.cityId : '');

  // Контур выбранного города: граница из БД, а при её отсутствии круг радиусом 5 км
  const city = cityQuery.data?.city;
  const outline = city
    ? {
        key: `city-${city.id}`,
        geometry: city.boundary ?? circlePolygon(city.lat, city.lng, NO_BOUNDARY_RADIUS_KM),
      }
    : null;

  function handleSelectOnMap(id) {
    setSelectedId(id);
    if (id) {
      document.getElementById(`exhibition-card-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  const mapItems = mapQuery.data?.items ?? [];
  const total = listQuery.data?.total;

  return (
    <div className={styles.page}>
      <h1 tabIndex={-1} className={styles.title}>Каталог выставок</h1>

      <div className={styles.columns}>
        <div className={styles.listColumn}>
          <FiltersPanel
            params={params}
            categories={categoriesQuery.data?.items ?? []}
            cities={citiesQuery.data?.items ?? []}
            hasActiveFilters={hasActiveFilters}
            onChange={update}
            onReset={reset}
          />
          {(categoriesQuery.isError || citiesQuery.isError) && (
            <p className={styles.notice} role="alert">
              Не удалось загрузить справочники городов или категорий. Обновите страницу.
            </p>
          )}

          {!isWide && (
            <div className={styles.viewToggle} role="group" aria-label="Режим отображения">
              <button type="button" aria-pressed={params.view === 'list'} onClick={() => update({ view: 'list' })}>
                Список
              </button>
              <button type="button" aria-pressed={params.view === 'map'} onClick={() => update({ view: 'map' })}>
                Карта
              </button>
            </div>
          )}

          {showList && (
            <ExhibitionList
              query={listQuery}
              params={params}
              selectedId={selectedId ?? hoveredId}
              onHover={setHoveredId}
              onPageChange={(page) => update({ page })}
              onReset={reset}
              hasActiveFilters={hasActiveFilters}
            />
          )}
        </div>

        {showMap && (
          <section className={styles.mapColumn} aria-label="Карта">
            <p className={styles.counter} role="status" aria-live="polite">
              {mapQuery.isPending
                ? 'Загружаем метки'
                : `На карте ${mapItems.length}${total !== undefined ? ` из ${total}` : ''} выставок${
                    mapQuery.data?.truncated ? ' (показаны не все метки)' : ''
                  }`}
            </p>
            {mapQuery.isError && <ErrorMessage error={mapQuery.error} onRetry={mapQuery.refetch} />}
            <div className={styles.mapBox}>
              <ExhibitionsMap
                items={mapItems}
                outline={outline}
                hoveredId={hoveredId}
                selectedId={selectedId}
                onSelect={handleSelectOnMap}
                onOpen={(id) => navigate(`/exhibitions/${id}`)}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
