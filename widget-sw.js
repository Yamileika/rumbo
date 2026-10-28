const WIDGET_TAG = 'rumbo-ruta';
const WIDGET_STATE_CACHE = 'widget-state-' + WIDGET_TAG;
self.addEventListener('message', event => {
  if (event.data?.type === 'WIDGET_SUPPORT') {
    event.ports[0]?.postMessage({supported: Boolean(self.widgets)});
  }
});
const widgetStateURL = new URL('widgets/state.json', self.registration.scope).href;
async function widgetData() {
  const state = await (await caches.open(WIDGET_STATE_CACHE)).match(widgetStateURL);
  if (state) return state.text();
  const defaults = await caches.match(new URL('widgets/data.json', self.registration.scope).href);
  return defaults ? defaults.text() : JSON.stringify({result:'Sin resultados', detail:'Abre Rumbo y elige una ruta.'});
}
async function renderDesktopWidget(widget) {
  if (!self.widgets || !widget) return;
  const templateURL = new URL('widgets/template.json', self.registration.scope).href;
  const response = await caches.match(templateURL) || await fetch(templateURL);
  await self.widgets.updateByTag(WIDGET_TAG, {template:await response.text(), data:await widgetData()});
}
async function refreshDesktopWidgets() {
  if (self.widgets) await renderDesktopWidget(await self.widgets.getByTag(WIDGET_TAG));
}
self.addEventListener('widgetinstall', event => event.waitUntil(renderDesktopWidget(event.widget)));
self.addEventListener('widgetresume', event => event.waitUntil(renderDesktopWidget(event.widget)));
self.addEventListener('activate', event => event.waitUntil(refreshDesktopWidgets().catch(() => {})));
self.addEventListener('widgetclick', event => {
  if (event.action === 'open-app') event.waitUntil(self.clients.openWindow(new URL('./', self.registration.scope).href));
  if (event.action === 'refresh') event.waitUntil(refreshDesktopWidgets());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'WIDGET_RESULT') return;
  const data = event.data.data;
  if (!data || typeof data.result !== 'string' || typeof data.detail !== 'string') return;
  event.waitUntil((async () => {
    const cache = await caches.open(WIDGET_STATE_CACHE);
    await cache.put(widgetStateURL, new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}}));
    await refreshDesktopWidgets();
  })());
});
