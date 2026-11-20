const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/** snake_case -> camelCase для ключей строки результата SQL (только верхний уровень). */
export function camelizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value]));
}
