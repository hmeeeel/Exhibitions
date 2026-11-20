import { randomUUID } from 'node:crypto';

const VALID_ID = /^[\w-]{8,64}$/;

/** Присваивает запросу идентификатор (req.id) и возвращает его в заголовке X-Request-Id. */
export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
