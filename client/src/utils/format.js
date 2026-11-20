const MONTHS_SHORT = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];

function parts(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

/** '2026-11-15','2026-12-15' -> '15 нояб. – 15 дек. 2026' */
export function formatDateRange(start, end) {
  const a = parts(start);
  const b = parts(end);
  const left = `${a.day} ${MONTHS_SHORT[a.month - 1]}`;
  const right = `${b.day} ${MONTHS_SHORT[b.month - 1]}`;
  if (start === end) return `${right} ${b.year}`;
  return a.year === b.year ? `${left} – ${right} ${b.year}` : `${left} ${a.year} – ${right} ${b.year}`;
}

/** 0  - бесплатно, null  - не указана  */
export function formatPrice(price) {
  if (price === null || price === undefined) return 'Стоимость не указана';
  if (price === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'BYN' }).format(price);
}

/** Сегодняшняя дата в формате ГГГГ-ММ-ДД по времени Минска (как fn_today() в БД). */
export function todayInMinsk() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
}
