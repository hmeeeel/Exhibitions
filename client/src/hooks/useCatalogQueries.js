import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getExhibitions, getExhibitionsForMap } from '../api/exhibitions.js';
import { getCategories, getCities, getCity } from '../api/references.js';
import { REFERENCE_STALE_TIME } from '../app/queryClient.js';
import { PAGE_LIMIT } from './useCatalogParams.js';


export function useExhibitionsQuery(filters, params) {
  const apiParams = { ...filters, sort: params.sort, order: params.order, page: params.page, limit: PAGE_LIMIT };
  return useQuery({
    queryKey: ['exhibitions', apiParams],
    queryFn: ({ signal }) => getExhibitions(apiParams, signal),
    placeholderData: keepPreviousData, // при смене страницы остаётся предыдущий список, а не пустота
  });
}

export function useMapExhibitionsQuery(filters, enabled) {
  return useQuery({
    queryKey: ['exhibitions', 'map', filters],
    queryFn: ({ signal }) => getExhibitionsForMap(filters, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useCitiesQuery() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: REFERENCE_STALE_TIME,
  });
}

/** Город вместе с контуром (boundary)  - только когда город выбран в фильтре. */
export function useCityQuery(cityId) {
  return useQuery({
    queryKey: ['city', cityId],
    queryFn: ({ signal }) => getCity(cityId, signal),
    enabled: Boolean(cityId),
    staleTime: REFERENCE_STALE_TIME,
  });
}
