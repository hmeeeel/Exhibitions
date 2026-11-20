import * as service from './cities.service.js';

export async function list(req, res) {
  res.json(await service.listCities(req.valid.query));
}

export async function getById(req, res) {
  res.json(await service.getCity(req.valid.params.id));
}
