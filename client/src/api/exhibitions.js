import { http } from './http.js';

export const getExhibitions = (params, signal) => http('/exhibitions', { params, signal });
export const getExhibitionsForMap = (params, signal) => http('/exhibitions/map', { params, signal });
export const getExhibition = (id, signal) => http(`/exhibitions/${id}`, { signal });
