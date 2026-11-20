// Загрузка JavaScript API Яндекс Карт v3. Скрипт подключается один раз на всё приложение.
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY;

export class MapKeyMissingError extends Error {
  constructor() {
    super('Не задан ключ VITE_YANDEX_MAPS_KEY');
    this.name = 'MapKeyMissingError';
  }
}

let loadingPromise = null;

export function loadYandexMaps() {
  if (!API_KEY) return Promise.reject(new MapKeyMissingError());
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(API_KEY)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps3.ready.then(() => resolve(window.ymaps3), reject);
    script.onerror = () => {
      loadingPromise = null; // позволяет повторить попытку
      reject(new Error('Не удалось загрузить Яндекс Карты'));
    };
    document.head.appendChild(script);
  });
  return loadingPromise;
}
