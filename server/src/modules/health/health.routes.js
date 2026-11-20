import { Router } from 'express';
import { checkDatabaseConnection } from '../../config/db.js';

export const healthRouter = Router();

// Проверка работоспособности сервера и подключения к БД.
// При недоступной БД ошибка уходит в errorHandler и превращается в 503.
healthRouter.get('/', async (_req, res) => {
  await checkDatabaseConnection();
  res.json({ status: 'ok' });
});
