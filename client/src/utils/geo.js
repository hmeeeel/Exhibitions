/** Многоугольник-«круг» радиусом radiusKm вокруг точки: запасной контур, если у города нет геоформы. */
export function circlePolygon(lat, lng, radiusKm = 5, steps = 64) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (2 * Math.PI * i) / steps;
    ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

/** Polygon | MultiPolygon -> массив полигонов (каждый  - массив колец). */
export function toPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

/** Границы набора точек [lng, lat] в формате [[minLng, minLat], [maxLng, maxLat]]. */
export function boundsOf(points) {
  if (points.length === 0) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function polygonPoints(polygons) {
  return polygons.flatMap((rings) => rings[0] ?? []);
}
