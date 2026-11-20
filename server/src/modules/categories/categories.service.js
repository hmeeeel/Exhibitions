import * as repo from './categories.repo.js';

export async function listCategories() {
  return { items: await repo.findAll() };
}
