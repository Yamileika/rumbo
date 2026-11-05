const geo = (() => {
const EARTH = 6371000;
const rad = d => d * Math.PI / 180;
function distance(a, b) {
 const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
 const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
 return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}
// Proyección local equirectangular: suficiente para tramos urbanos de unos cuantos kilómetros.
function project(p, a, b) {
 const k = Math.cos(rad(p[0])), xy = q => [rad(q[1] - p[1]) * k * EARTH, rad(q[0] - p[0]) * EARTH];
 const [ax, ay] = xy(a), [bx, by] = xy(b), dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
 const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
 return {meters: Math.hypot(ax + t * dx, ay + t * dy), t};
}
const toSegment = (p, a, b) => project(p, a, b).meters;
function toRoute(p, points) {
 if (points.length === 1) return distance(p, points[0]);
 let best = Infinity;
 for (let i = 1; i < points.length; i++) best = Math.min(best, toSegment(p, points[i - 1], points[i]));
 return best;
}
// Distancia recorrida desde el inicio hasta el punto de la ruta más cercano a p; sirve para ordenar paradas.
function along(p, points) {
 let best = Infinity, result = 0, walked = 0;
 for (let i = 1; i < points.length; i++) {
  const seg = distance(points[i - 1], points[i]), {meters, t} = project(p, points[i - 1], points[i]);
  if (meters < best) { best = meters; result = walked + t * seg; }
  walked += seg;
 }
 return result;
}
function length(points) {
 let total = 0;
 for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
 return total;
}
function near(p, routes, radius) {
 return routes.map(route => ({route, meters: toRoute(p, route.points)})).filter(r => r.meters <= radius).sort((a, b) => a.meters - b.meters);
}
const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const isPoint = q => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite) && Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180;
const round = q => [+q[0].toFixed(6), +q[1].toFixed(6)];
const pointList = list => (Array.isArray(list) ? list : []).filter(isPoint).map(round);
// Acepta un arreglo de rutas o {rutas:[...]}; descarta puntos fuera de rango y rutas sin nombre o con menos de dos puntos.
function validate(data) {
 const list = Array.isArray(data) ? data : data && Array.isArray(data.rutas) ? data.rutas : null;
 if (!list) throw new Error('El archivo no contiene una lista de rutas.');
 const routes = [];
 for (const r of list) {
  if (!r || typeof r !== 'object') continue;
  const points = pointList(r.points), name = clean(r.name, 80);
  if (!name || points.length < 2) continue;
  const waypoints = pointList(r.waypoints);
  const legs = Array.isArray(r.legs) ? r.legs.map(pointList) : [];
  const route = {
   id: clean(r.id, 60) || 'r-' + Math.random().toString(36).slice(2, 10),
   name, code: clean(r.code, 12), from: clean(r.from, 80), to: clean(r.to, 80),
   via: (Array.isArray(r.via) ? r.via : []).map(v => clean(v, 60)).filter(Boolean).slice(0, 20),
   fare: clean(r.fare, 40), hours: clean(r.hours, 80), frequency: clean(r.frequency, 60), notes: clean(r.notes, 400),
   color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color.toLowerCase() : '#0f766e',
   source: ['oficial', 'capturada', 'ejemplo'].includes(r.source) ? r.source : 'capturada',
   stops: (Array.isArray(r.stops) ? r.stops : []).filter(s => s && isPoint(s.point)).map(s => ({name: clean(s.name, 60) || 'Parada', point: round(s.point)})).slice(0, 80),
   points
  };
  // Los tramos solo se conservan si coinciden con los puntos de control; el panel de administración los usa para editar.
  if (waypoints.length >= 2) { route.waypoints = waypoints; if (legs.length === waypoints.length - 1 && legs.every(l => l.length >= 2)) route.legs = legs; }
  routes.push(route);
 }
 if (!routes.length) throw new Error('No se encontró ninguna ruta válida (nombre y al menos dos puntos).');
 return routes;
}
function sortStops(stops, points) {
 return stops.map(s => ({s, at: along(s.point, points)})).sort((a, b) => a.at - b.at).map(x => x.s);
}
return {distance, toSegment, toRoute, along, length, near, validate, sortStops};
})();
if (typeof module !== 'undefined') module.exports = geo;
