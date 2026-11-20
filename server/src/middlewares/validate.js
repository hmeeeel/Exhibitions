import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

// Сообщения zod по умолчанию  - на русском языке
z.config(z.locales.ru());

/** Пустые строки в query означают «параметр не передан». */
function dropEmptyStrings(source) {
  return Object.fromEntries(Object.entries(source ?? {}).filter(([, value]) => value !== ''));
}

/**
 * validate({ body, query, params })  - проверяет части запроса схемами zod.
 * Неизвестные поля отбрасываются. Результат кладётся в req.valid, а не обратно
 * в req: свойство req.query доступно только для чтения.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const sources = {
      params: req.params,
      query: dropEmptyStrings(req.query),
      body: req.body,
    };
    const valid = {};
    const details = [];

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(sources[part]);
      if (result.success) {
        valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || part, message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Проверьте правильность введённых данных', details));
    }
    req.valid = valid;
    next();
  };
}
