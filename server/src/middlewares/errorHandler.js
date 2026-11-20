import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

// Ограничения БД, нарушение которых означает конфликт (409), -> код ошибки
const UNIQUE_CONSTRAINT_CODES = {
  users_email_key: 'EMAIL_TAKEN',
  saved_exhibitions_pkey: 'ALREADY_SAVED',
  subscriptions_unique: 'ALREADY_SUBSCRIBED',
};

const BUSINESS_ERRORS = {
  NOT_FOUND: [404, 'Запрошенный ресурс не найден'],
  ALREADY_PROCESSED: [409, 'Заявка уже обработана'],
  TOO_MANY_PENDING: [409, 'Превышен лимит заявок на рассмотрении'],
};

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN',
  '57P01', '57P03', '53300',
]);

function isConnectionError(error) {
  return CONNECTION_ERROR_CODES.has(error.code) || (typeof error.code === 'string' && error.code.startsWith('08'));
}

/** Приводит ошибку любого происхождения к виду { status, code, message, details }. */
function normalize(error) {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    const details = error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return new AppError(400, 'VALIDATION_ERROR', 'Проверьте правильность введённых данных', details);
  }
  // Некорректный JSON в теле запроса (body-parser)
  if (error.type === 'entity.parse.failed') {
    return new AppError(400, 'VALIDATION_ERROR', 'Тело запроса содержит некорректный JSON');
  }
  if (error.type === 'entity.too.large') {
    return new AppError(413, 'VALIDATION_ERROR', 'Тело запроса слишком большое');
  }
  if (isConnectionError(error)) {
    return new AppError(503, 'SERVICE_UNAVAILABLE', 'Сервис временно недоступен. Повторите попытку позже');
  }
  if (error.code === '23505') {
    const code = UNIQUE_CONSTRAINT_CODES[error.constraint] ?? 'CONFLICT';
    return new AppError(409, code, 'Такая запись уже существует');
  }
  if (['23503', '23514', '22P02'].includes(error.code)) {
    return new AppError(400, 'VALIDATION_ERROR', 'Переданы некорректные данные');
  }
  if (error.code === 'P0001' && BUSINESS_ERRORS[error.message]) {
    const [status, message] = BUSINESS_ERRORS[error.message];
    return new AppError(status, error.message, message);
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера');
}

// Подключается последним. Четыре параметра обязательны: так Express узнаёт об обработчике ошибок.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  const appError = normalize(error);

  if (appError.status >= 500) {
    // Подробности (стек, SQL) попадают только в журнал, не клиенту
    req.log.error({ err: error }, 'Ошибка при обработке запроса');
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      requestId: req.id,
    },
  });
}
