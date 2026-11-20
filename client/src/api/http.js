const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Ошибка API в едином формате сервера: { error: { code, message, details, requestId } }. */
export class ApiError extends Error {
  constructor(status, code, message, details, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function buildUrl(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return `${BASE_URL}${path}${query ? `?${query}` : ''}`;
}

/** Единая точка обращения к серверу: любой неуспешный ответ становится ApiError. */
export async function http(path, { method = 'GET', params, body, signal } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Не удалось связаться с сервером. Проверьте подключение к сети.');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // тело не JSON: обработаем ниже по статусу
  }
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Не удалось выполнить запрос',
      error?.details,
      error?.requestId,
    );
  }
  return data;
}
