const test = require('node:test');
const assert = require('node:assert/strict');
const geo = require('./geo.js');

const a = [20.08, -98.37], b = [20.09, -98.37], c = [20.09, -98.36];
const routes = [{id: 'x', points: [a, b]}, {id: 'y', points: [[20.07, -98.35], [20.07, -98.34]]}];

test('distance: mide metros entre dos puntos', () => {
 assert.ok(Math.abs(geo.distance(a, b) - 1112) < 2);
 assert.equal(geo.distance(a, a), 0);
});

test('toSegment: distancia de un punto a un tramo', () => {
 assert.ok(Math.abs(geo.toSegment([20.085, -98.37], a, b)) < 0.5);
 assert.ok(Math.abs(geo.toSegment([20.085, -98.369], a, b) - 104.5) < 1);
 assert.ok(Math.abs(geo.toSegment([20.10, -98.37], a, b) - 1112) < 3);
});

test('length: largo total de una ruta', () => {
 assert.ok(Math.abs(geo.length([a, b, a]) - 2224) < 4);
});

test('near: rutas que pasan cerca de un punto', () => {
 const n = geo.near([20.085, -98.371], routes, 300);
 assert.equal(n.length, 1);
 assert.equal(n[0].route.id, 'x');
 assert.equal(geo.near([20.085, -98.371], routes, 50).length, 0);
 assert.equal(geo.near(a, [{id: 'p', points: [a]}], 10).length, 1);
});

test('along y sortStops: ordenar paradas según el recorrido', () => {
 assert.ok(Math.abs(geo.along([20.085, -98.3701], [a, b, c]) - 556) < 3);
 assert.ok(Math.abs(geo.along([20.0901, -98.365], [a, b, c]) - 1112 - 523) < 5);
 const sorted = geo.sortStops([{name: 'fin', point: c}, {name: 'inicio', point: a}, {name: 'medio', point: b}], [a, b, c]);
 assert.deepEqual(sorted.map(s => s.name), ['inicio', 'medio', 'fin']);
});

test('validate: limpia rutas válidas y descarta las malas', () => {
 const v = geo.validate({rutas: [
  {name: ' Ruta 1 ', color: '#ABCDEF', source: 'oficial', points: [a, b, [200, 0], 'x'], stops: [{name: 'Centro', point: a}, {name: 'mala', point: [1]}], waypoints: [a, b], legs: [[a, b]]},
  {name: '', points: [a, b]}, {name: 'Sola', points: [a]}, null
 ]});
 assert.equal(v.length, 1);
 assert.equal(v[0].name, 'Ruta 1');
 assert.equal(v[0].color, '#abcdef');
 assert.equal(v[0].points.length, 2);
 assert.equal(v[0].source, 'oficial');
 assert.equal(v[0].stops.length, 1);
 assert.equal(v[0].legs.length, 1);
 const w = geo.validate([{name: 'R', color: 'rojo', source: 'otra', points: [a, b], waypoints: [a, b, c], legs: [[a, b]]}])[0];
 assert.equal(w.source, 'capturada');
 assert.equal(w.color, '#0f766e');
 assert.equal(w.waypoints.length, 3);
 assert.equal(w.legs, undefined);
 for (const bad of [null, {}, 'x', [{name: 'R', points: [a]}]]) assert.throws(() => geo.validate(bad));
});
