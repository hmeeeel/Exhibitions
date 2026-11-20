/** Экранирует %, _ и \ , чтобы строка в ILIKE искалась буквально. */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}
