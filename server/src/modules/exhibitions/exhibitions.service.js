import { MAP_MARKERS_LIMIT } from '../../config/limits.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './exhibitions.repo.js';

export async function listExhibitions(filters) {
  const { items, total } = await repo.findPage(filters);
  return {
    items,
    page: filters.page,
    limit: filters.limit,
    total,
    totalPages: Math.ceil(total / filters.limit),
  };
}

export async function listExhibitionsForMap(filters) {
  const rows = await repo.findForMap(filters, MAP_MARKERS_LIMIT);
  const truncated = rows.length > MAP_MARKERS_LIMIT;
  return { items: truncated ? rows.slice(0, MAP_MARKERS_LIMIT) : rows, truncated };
}

export async function getExhibition(id) {
  const exhibition = await repo.findById(id);
  if (!exhibition) throw new AppError(404, 'NOT_FOUND', 'Выставка не найдена');
  return { exhibition };
}
