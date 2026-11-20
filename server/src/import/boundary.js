// Получение и упрощение контура города из данных Commons (Data:*.map). Чистые функции.

const ROUND = 1e5;
const TOLERANCE = 0.0003;

const round5 = (n) => Math.round(n * ROUND) / ROUND;

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + clamped * dx), p[1] - (a[1] + clamped * dy));
}

/** Алгоритм Рамера  - Дугласа  - Пекера (итеративный, без рекурсии). */
export function simplifyLine(points, tolerance = TOLERANCE) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const distance = perpendicularDistance(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (index !== -1 && maxDistance > tolerance) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Упрощает внешнее кольцо или отверстие; возвращает null, если фигура вырождена. */
function simplifyRing(ring) {
  const rounded = ring.map(([lng, lat]) => [round5(lng), round5(lat)]);
  const open = rounded.slice(0, -1); // без замыкающей точки
  const simplified = simplifyLine(open);
  if (simplified.length < 3) return null;
  return [...simplified, simplified[0]];
}

function simplifyPolygon(rings) {
  const result = rings.map(simplifyRing).filter(Boolean);
  // Внешнее кольцо обязательно; если оно потеряно, полигон непригоден
  return rings.length > 0 && simplifyRing(rings[0]) ? result : null;
}

function collectPolygons(node, out) {
  if (!node || typeof node !== 'object') return;
  switch (node.type) {
    case 'FeatureCollection':
      node.features?.forEach((feature) => collectPolygons(feature, out));
      break;
    case 'Feature':
      collectPolygons(node.geometry, out);
      break;
    case 'Polygon':
      out.push(node.coordinates);
      break;
    case 'MultiPolygon':
      out.push(...node.coordinates);
      break;
    default:
      break; // точки, линии и прочее на контур не влияют
  }
}

/**
 * Принимает JSON страницы Commons ({ data: FeatureCollection }) или сам GeoJSON и
 * возвращает упрощённый Polygon / MultiPolygon либо null, если контура нет.
 */
export function extractBoundary(commonsJson) {
  const polygons = [];
  collectPolygons(commonsJson?.data ?? commonsJson, polygons);

  const simplified = polygons.map(simplifyPolygon).filter(Boolean);
  if (simplified.length === 0) return null;
  if (simplified.length === 1) return { type: 'Polygon', coordinates: simplified[0] };
  return { type: 'MultiPolygon', coordinates: simplified };
}
