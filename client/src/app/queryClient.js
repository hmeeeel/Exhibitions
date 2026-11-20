import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Повтор только при сбое сервера или сети; ошибки 4xx повторять бессмысленно
      retry: (failureCount, error) => (error.status === 0 || error.status >= 500) && failureCount < 1,
    },
  },
});

// Справочники меняются редко, поэтому кэшируются надолго
export const REFERENCE_STALE_TIME = 10 * 60_000;
