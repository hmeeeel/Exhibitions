import * as service from './exhibitions.service.js';

export async function list(req, res) {
  res.json(await service.listExhibitions(req.valid.query));
}

export async function listForMap(req, res) {
  res.json(await service.listExhibitionsForMap(req.valid.query));
}

export async function getById(req, res) {
  res.json(await service.getExhibition(req.valid.params.id));
}
