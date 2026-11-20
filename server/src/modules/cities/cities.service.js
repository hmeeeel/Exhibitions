import { AppError } from '../../utils/AppError.js';
import * as repo from './cities.repo.js';

export async function listCities({ withExhibitions }) {
  return { items: await repo.findAll({ withExhibitions }) };
}

export async function getCity(id) {
  const city = await repo.findById(id);
  if (!city) throw new AppError(404, 'NOT_FOUND', 'Город не найден');
  return { city };
}
