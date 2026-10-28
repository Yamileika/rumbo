const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
// Cada aplicación tiene su propio puerto (su propio origen), para que Windows y Edge las instalen
// como aplicaciones distintas, cada una con su widget, su service worker y sus datos.
const apps = [
  {name: 'Rumbo', port: 8090, root: __dirname},
  {name: 'Columna', port: 8091, root: path.resolve(__dirname, '..', 'columna')},
  {name: 'Temperatura', port: 8092, root: path.resolve(__dirname, '..', 'Demos', 'temperature-converter')}
];
const dataFile = path.join(__dirname, 'rutas.json');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
// El panel de administración de Rumbo publica con PUT /rutas.json. Solo se acepta desde su propia página local.
function publish(request, response, port) {
  const origin = request.headers.origin;
  if (origin !== 'http://localhost:' + port && origin !== 'http://127.0.0.1:' + port) { response.writeHead(403); response.end('Origen no permitido'); return; }
  if (!String(request.headers['content-type']).startsWith('application/json')) { response.writeHead(415); response.end('Se esperaba JSON'); return; }
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => { body += chunk; if (body.length > 5e6) { response.writeHead(413); response.end('Archivo demasiado grande'); request.destroy(); } });
  request.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch { response.writeHead(400); response.end('JSON inválido'); return; }
    if (!data || !Array.isArray(data.rutas)) { response.writeHead(400); response.end('Falta la lista de rutas'); return; }
    try {
      if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, path.join(__dirname, 'rutas.respaldo.json'));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 1));
      response.writeHead(204); response.end();
      console.log(new Date().toLocaleString('es-MX') + ' · publicadas ' + data.rutas.length + ' rutas');
    } catch { response.writeHead(500); response.end('No se pudo escribir rutas.json'); }
  });
}
for (const app of apps) {
  if (!fs.existsSync(app.root)) { console.log(app.name + ': no se encontró la carpeta ' + app.root); continue; }
  http.createServer((request, response) => {
    let target;
    try {
      target = path.resolve(app.root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    } catch {
      response.writeHead(400); response.end(); return;
    }
    if (target !== app.root && !target.startsWith(app.root + path.sep)) { response.writeHead(403); response.end(); return; }
    if (request.method === 'PUT' && target === dataFile) return publish(request, response, app.port);
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    fs.readFile(target, (error, content) => {
      if (error) { response.writeHead(404); response.end('No encontrado'); return; }
      response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
      if (target === dataFile || path.basename(target) === 'sw.js') response.setHeader('Cache-Control', 'no-cache');
      response.end(content);
    });
  }).listen(app.port, '127.0.0.1', () => console.log(app.name + ': http://localhost:' + app.port + '/' + (app.name === 'Rumbo' ? '   ·   Administración: http://localhost:' + app.port + '/admin.html' : '')));
}
