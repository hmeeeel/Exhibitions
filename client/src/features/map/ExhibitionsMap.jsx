import { useEffect, useRef, useState } from 'react';
import { formatDateRange } from '../../utils/format.js';
import { boundsOf, polygonPoints, toPolygons } from '../../utils/geo.js';
import belarusRaw from './data/belarus.geojson?raw';
import { loadYandexMaps, MapKeyMissingError } from './yandexMapsLoader.js';
import styles from './ExhibitionsMap.module.css';

const belarus = JSON.parse(belarusRaw);
const BELARUS_POLYGONS = toPolygons(belarus.geometry);
const BELARUS_BOUNDS = boundsOf(polygonPoints(BELARUS_POLYGONS));
const SOURCE = 'features';

const OUTLINE_STYLE = {
  fill: 'rgba(15, 118, 110, 0.08)',
  stroke: [{ color: '#0f766e', width: 2 }],
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Всплывающая карточка выставки над меткой. */
function createPopup(exhibition, { onOpen, onClose }) {
  const box = element('div', styles.popup);
  const close = element('button', styles.popupClose, '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Закрыть');
  close.addEventListener('click', onClose);
  box.append(close);

  if (exhibition.imageUrl) {
    const image = element('img', styles.popupImage);
    image.src = exhibition.imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    box.append(image);
  }
  box.append(
    element('strong', styles.popupTitle, exhibition.title),
    element('span', styles.popupMeta, exhibition.cityName),
    element('span', styles.popupMeta, formatDateRange(exhibition.startDate, exhibition.endDate)),
  );
  const open = element('button', styles.popupLink, 'Подробнее');
  open.type = 'button';
  open.addEventListener('click', () => onOpen(exhibition.id));
  box.append(open);
  return box;
}

/**
 * Карта Яндекс Карт v3. React управляет только контейнером; метки, контуры и
 * камера синхронизируются с данными в effect-ах и освобождаются в функциях очистки.
 */
/**
 * outline = { key, geometry }  - контур выбранного города либо null (тогда рисуется Беларусь).
 * key меняется вместе с контуром: по нему effect-ы понимают, что геометрию надо перерисовать.
 */
export function ExhibitionsMap({ items, outline, hoveredId, selectedId, onSelect, onOpen }) {
  const containerRef = useRef(null);
  const [api, setApi] = useState(null); // { ymaps, map }
  const [loadError, setLoadError] = useState(null);
  const markersRef = useRef(new Map()); // id -> { marker, pin }
  const handlersRef = useRef({ onSelect, onOpen });
  handlersRef.current = { onSelect, onOpen }; // обработчики меток всегда видят свежие колбэки

  // 1. Создание и уничтожение карты
  useEffect(() => {
    let cancelled = false;
    let map = null;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;
        const { YMap, YMapDefaultSchemeLayer, YMapFeatureDataSource, YMapLayer, YMapListener } = ymaps;
        map = new YMap(containerRef.current, { location: { center: [27.56, 53.9], zoom: 6 } });
        map.addChild(new YMapDefaultSchemeLayer({}));
        map.addChild(new YMapFeatureDataSource({ id: SOURCE }));
        map.addChild(new YMapLayer({ source: SOURCE, type: 'features', zIndex: 1800 }));
        // Щелчок по пустому месту карты снимает выделение
        map.addChild(new YMapListener({ layer: 'any', onClick: (object) => { if (!object) handlersRef.current.onSelect(null); } }));
        setApi({ ymaps, map });
      })
      .catch((error) => !cancelled && setLoadError(error));

    return () => {
      cancelled = true;
      markersRef.current.clear();
      map?.destroy();
      setApi(null);
    };
  }, []);

  // 2. Метки выставок
  useEffect(() => {
    if (!api) return undefined;
    const { ymaps, map } = api;
    const created = [];
    markersRef.current.clear();

    for (const exhibition of items) {
      const pin = element('div', styles.pin);
      pin.title = exhibition.title;
      const marker = new ymaps.YMapMarker(
        {
          coordinates: [exhibition.lng, exhibition.lat],
          source: SOURCE,
          onClick: () => handlersRef.current.onSelect(exhibition.id),
        },
        pin,
      );
      map.addChild(marker);
      created.push(marker);
      markersRef.current.set(exhibition.id, { marker, pin });
    }
    return () => {
      created.forEach((marker) => map.removeChild(marker));
      markersRef.current.clear();
    };
  }, [api, items]);

  // 3. Подсветка метки при наведении на карточку и при выборе
  useEffect(() => {
    for (const [id, { pin }] of markersRef.current) {
      pin.classList.toggle(styles.pinHover, id === hoveredId);
      pin.classList.toggle(styles.pinSelected, id === selectedId);
    }
  }, [api, items, hoveredId, selectedId]);

  // 4. Всплывающая карточка выбранной выставки
  useEffect(() => {
    const exhibition = items.find((item) => item.id === selectedId);
    if (!api || !exhibition) return undefined;
    const { ymaps, map } = api;
    const popup = new ymaps.YMapMarker(
      { coordinates: [exhibition.lng, exhibition.lat], source: SOURCE, zIndex: 2000 },
      createPopup(exhibition, {
        onOpen: (id) => handlersRef.current.onOpen(id),
        onClose: () => handlersRef.current.onSelect(null),
      }),
    );
    map.addChild(popup);
    return () => map.removeChild(popup);
  }, [api, items, selectedId]);

  // 5. Контур: выбранный город (граница из БД или круг 5 км) либо Беларусь
  const outlineKey = outline?.key ?? 'belarus';
  useEffect(() => {
    if (!api) return undefined;
    const { ymaps, map } = api;
    const polygons = outline ? toPolygons(outline.geometry) : BELARUS_POLYGONS;
    const features = polygons.map(
      (coordinates) =>
        new ymaps.YMapFeature({ geometry: { type: 'Polygon', coordinates }, style: OUTLINE_STYLE, source: SOURCE }),
    );
    features.forEach((feature) => map.addChild(feature));
    return () => features.forEach((feature) => map.removeChild(feature));
    // Перерисовка только при смене контура (outlineKey), а не геометрии объекта
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, outlineKey]);

  // 6. Камера: показать контур города, иначе все метки, иначе всю Беларусь
  useEffect(() => {
    if (!api) return;
    const points = outline
      ? polygonPoints(toPolygons(outline.geometry))
      : items.map((item) => [item.lng, item.lat]);
    if (!outline && items.length === 1) {
      api.map.setLocation({ center: points[0], zoom: 13, duration: 300 });
      return;
    }
    api.map.setLocation({ bounds: boundsOf(points) ?? BELARUS_BOUNDS, duration: 300 });
    // Камера двигается при смене данных, а не при каждом наведении на карточку
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, items, outlineKey]);

  if (loadError) {
    const noKey = loadError instanceof MapKeyMissingError;
    return (
      <div className={styles.fallback} role="alert">
        <strong>{noKey ? 'Карта не настроена' : 'Карта недоступна'}</strong>
        <span>
          {noKey
            ? 'Укажите ключ в client/.env: VITE_YANDEX_MAPS_KEY  - и перезапустите клиент.'
            : 'Не удалось загрузить Яндекс Карты. Список выставок при этом работает.'}
        </span>
      </div>
    );
  }
  return <div ref={containerRef} className={styles.map} aria-label="Карта выставок" />;
}
