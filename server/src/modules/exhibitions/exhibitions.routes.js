import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import * as controller from './exhibitions.controller.js';
import { exhibitionIdParams, listQuery, mapQuery } from './exhibitions.schema.js';

export const exhibitionsRouter = Router();

exhibitionsRouter.get('/', validate({ query: listQuery }), controller.list);
// Маршрут /map объявлен раньше /:id, иначе «map» был бы принят за идентификатор
exhibitionsRouter.get('/map', validate({ query: mapQuery }), controller.listForMap);
exhibitionsRouter.get('/:id', validate({ params: exhibitionIdParams }), controller.getById);
