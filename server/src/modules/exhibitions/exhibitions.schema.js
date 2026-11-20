import { z } from 'zod';
import {
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  SEARCH_QUERY_MAX_LENGTH,
} from '../../config/limits.js';

export const SORT_FIELDS = ['startDate', 'endDate', 'title', 'savedCount'];

const id = z.coerce
  .number({ error: 'Должно быть положительным целым числом' })
  .int('Должно быть положительным целым числом')
  .positive('Должно быть положительным целым числом');
const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

const isRealDate = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
  .refine(isRealDate, 'Такой даты не существует');

// Фильтры одинаковы для списка и для карты
const filterShape = {
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  cityId: id.optional(),
  categoryId: id.optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
  includePast: booleanQuery.default(false),
};

// Период задаётся корректно, только если начало не позже конца
function checkDateRange(data, ctx) {
  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    ctx.addIssue({
      code: 'custom',
      path: ['dateFrom'],
      message: 'Дата начала периода не может быть позже даты окончания',
    });
  }
}

export const listQuery = z
  .object({
    ...filterShape,
    sort: z.enum(SORT_FIELDS).default('startDate'),
    order: z.enum(['asc', 'desc']).default('asc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
  })
  .superRefine(checkDateRange);

export const mapQuery = z.object(filterShape).superRefine(checkDateRange);

export const exhibitionIdParams = z.object({ id });
