import { z } from 'zod';

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const listCitiesQuery = z.object({
  // true (по умолчанию)  - только города, в которых есть выставки
  withExhibitions: booleanQuery.default(true),
});

export const cityIdParams = z.object({
  id: z.coerce
    .number({ error: 'Должно быть положительным целым числом' })
    .int('Должно быть положительным целым числом')
    .positive('Должно быть положительным целым числом'),
});
