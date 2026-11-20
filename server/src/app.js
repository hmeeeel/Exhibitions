import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { requestId } from './middlewares/requestId.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { citiesRouter } from './modules/cities/cities.routes.js';
import { exhibitionsRouter } from './modules/exhibitions/exhibitions.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // requestId -> журнал -> JSON -> маршруты -> 404 -> ошибки
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/cities', citiesRouter);
  app.use('/api/exhibitions', exhibitionsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
