import { createApp } from './app.js';
import { checkDatabaseConnection, closePool } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`Сервер запущен: http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Недоступная БД не останавливает сервер: запросы к ней получат 503
checkDatabaseConnection()
  .then(() => logger.info('Подключение к PostgreSQL установлено'))
  .catch((error) => logger.error({ err: error }, 'PostgreSQL недоступна. Проверьте DATABASE_URL'));

async function shutdown(signal) {
  logger.info(`Получен ${signal}, завершение работы`);
  server.close(async () => {
    await closePool().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Необработанное отклонение промиса'));
