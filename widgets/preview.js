(() => {
  const panel=document.createElement('section');
  panel.className='desktop-widget-preview widget-rumbo';
  panel.innerHTML='<div class="widget-top"><span class="widget-mark" aria-hidden="true">◉</span><div><p class="widget-brand">RUMBO / COLECTIVAS</p><p class="widget-caption">VISTA PREVIA DE ESCRITORIO</p></div><span class="widget-state">LOCAL</span></div><div class="widget-body"><p class="widget-kicker">TU RUTA DE HOY</p><h2>¿Por dónde pasa?</h2><strong class="widget-result"></strong><p class="widget-detail"></p><div class="widget-decoration" aria-hidden="true"></div></div><div class="widget-bottom"><span class="widget-footnote"></span><button type="button" class="widget-action">Ver en el mapa ↗</button></div><details class="widget-support"><summary>Widget de Windows · compatibilidad</summary><p class="widget-support-status" role="status"></p><p>Para el panel nativo se necesita una configuración compatible de Windows 11 y Edge. Esta tarjeta es una vista previa de la aplicación; no confirma que el widget esté instalado en Windows.</p></details>';
  panel.querySelector('.widget-action').onclick=()=>{const r=selectedRoute();document.querySelector('#about-dialog').close();if(r)openRoute(r.id);};
  document.querySelector('#widget-slot').append(panel);
  const support=panel.querySelector('.widget-support-status');
  async function checkSupport(){
    if(!('serviceWorker'in navigator)||!window.isSecureContext){support.textContent='Abre desde HTTPS o localhost para comprobar la integración.';return;}
    support.textContent='Comprobando disponibilidad…';
    let answered=false;
    const pending=setTimeout(()=>{if(!answered)support.textContent='El servicio aún no responde. Recarga después de la primera instalación.';},6000);
    try{
      const registration=await navigator.serviceWorker.ready;
      const channel=new MessageChannel();
      channel.port1.onmessage=event=>{
        answered=true;clearTimeout(pending);
        support.textContent=event.data.supported?'La API de widgets está disponible. Abre Windows + W y busca la aplicación en Agregar widgets.':'Este navegador no expone self.widgets. La PWA funciona, pero no puede registrarse en el panel nativo desde esta configuración.';
        channel.port1.close();
      };
      registration.active?.postMessage({type:'WIDGET_SUPPORT'},[channel.port2]);
    }catch{clearTimeout(pending);support.textContent='No se pudo consultar el servicio de widgets.';}
  }
  function publish(){
    const r=selectedRoute();
    const data=r?{result:(r.code?r.code+' · ':'')+r.name,detail:[[r.from,r.to].filter(Boolean).join(' → '),r.fare&&'Tarifa '+r.fare,r.hours].filter(Boolean).join(' · ')||'Sin datos adicionales.'}:{result:'Sin rutas',detail:'Captura o importa una ruta en Rumbo.'};
    panel.style.setProperty('--route-color',r?.color||'#0f766e');
    panel.querySelector('.widget-footnote').textContent=saved.size+' guardadas · '+routes.length+' rutas en total';
    panel.querySelector('.widget-result').textContent=data.result;
    panel.querySelector('.widget-detail').textContent=data.detail;
    if('serviceWorker'in navigator)navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'WIDGET_RESULT',data})).catch(()=>{});
  }
  window.addEventListener('rumbo-change',publish);
  if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{publish();checkSupport();});
  publish();checkSupport();
})();
