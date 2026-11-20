import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import * as controller from './cities.controller.js';
import { cityIdParams, listCitiesQuery } from './cities.schema.js';

export const citiesRouter = Router();

citiesRouter.get('/', validate({ query: listCitiesQuery }), controller.list);
citiesRouter.get('/:id', validate({ params: cityIdParams }), controller.getById);
