import * as service from './categories.service.js';

export async function list(_req, res) {
  res.json(await service.listCategories());
}
