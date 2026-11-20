const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const REQUEST_TIMEOUT_MS = 60_000;

// Q184  - Беларусь, Q515  - город (с подклассами). Порядок по убыванию населения
// нужен для правила «при одинаковых названиях сохраняется самый крупный город».
export const BELARUS_CITIES_QUERY = `
SELECT ?city ?cityLabel ?coord ?population ?geoshape WHERE {
  ?city wdt:P17 wd:Q184 .
  ?city wdt:P31/wdt:P279* wd:Q515 .
  ?city wdt:P625 ?coord .
  ?city rdfs:label ?cityLabel . FILTER(LANG(?cityLabel) = "ru")
  OPTIONAL { ?city wdt:P1082 ?population . }
  OPTIONAL { ?city wdt:P3896 ?geoshape . }
}
ORDER BY DESC(?population)
`;

async function getJson(url, userAgent, headers = {}) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent, ...headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} (${new URL(url).hostname})`);
  }
  return response.json();
}

/** Возвращает массив bindings из ответа SPARQL (формат application/sparql-results+json). */
export async function fetchCityBindings(userAgent) {
  const url = `${SPARQL_ENDPOINT}?${new URLSearchParams({ query: BELARUS_CITIES_QUERY })}`;
  const json = await getJson(url, userAgent, { Accept: 'application/sparql-results+json' });
  const bindings = json?.results?.bindings;
  if (!Array.isArray(bindings)) {
    throw new Error('Неожиданный формат ответа Wikidata: нет results.bindings');
  }
  return bindings;
}

/** Загружает страницу Commons (Data:*.map) и возвращает её JSON. */
export async function fetchGeoshape(geoshapeUrl, userAgent) {
  const url = geoshapeUrl.replace(/^http:\/\//, 'https://');
  return getJson(url, userAgent, { Accept: 'application/json' });
}
