import { http } from './http.js';

export const getCategories = (signal) => http('/categories', { signal });
export const getCities = (signal) => http('/cities', { signal });
export const getCity = (id, signal) => http(`/cities/${id}`, { signal });
