(() => {
  const icon = {"share":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><path d=\"m9 10 6-4M9 14l6 4\"/></svg>","camera":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 7h4l2-3h6l2 3h4v13H3Z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg>"};
  const panel = document.createElement('section');
  panel.className = 'sharing-panel';
  panel.innerHTML = '<div><p class="eyebrow">AVÍSALE A QUIEN VA CONTIGO</p><h2 id="share-title"></h2><p id="share-description"></p></div><div class="share-actions"><button id="share-text" type="button">'+icon.share+'<span>Compartir ruta</span></button><button id="share-capture" type="button">'+icon.camera+'<span>Compartir imagen del recorrido</span></button></div><p id="share-status" role="status"></p><section id="received" hidden><h3>Contenido recibido</h3><pre></pre><button type="button" id="received-close">Cerrar</button></section>';
  document.querySelector('main').append(panel);
  function describe(r){return r?[r.from&&r.to?r.from+' → '+r.to:r.from||r.to,r.via.length?'Pasa por '+r.via.join(', '):'',r.fare?'Tarifa '+r.fare:''].filter(Boolean).join(' · ')||'Sin datos adicionales.':'Captura o importa una ruta para compartirla.';}
  function refresh(){const r=selectedRoute();document.querySelector('#share-title').textContent=r?(r.code?r.code+' · ':'')+r.name:'Sin rutas todavía';document.querySelector('#share-description').textContent=describe(r);document.querySelectorAll('.share-actions button').forEach(b=>b.disabled=!r);}
  window.addEventListener('rumbo-selection', refresh);
  window.addEventListener('rumbo-library-change', refresh);
  const topSearch = document.querySelector('#toolbar-search'), search = document.querySelector('#search');
  topSearch.addEventListener('input', () => {search.value=topSearch.value;render();});
  search.addEventListener('input',()=>{topSearch.value=search.value;});
  document.querySelector('#clear').addEventListener('click',()=>{topSearch.value='';});
  const nearButton=document.querySelector('#toolbar-near');
  nearButton.onclick=()=>document.querySelector('#near').click();
  window.addEventListener('rumbo-mode',()=>nearButton.setAttribute('aria-pressed',String(mode==='near')));
  const libraryButton=document.querySelector('#toolbar-library');
  libraryButton.onclick=()=>{document.querySelector('[data-view="'+(view==='saved'?'all':'saved')+'"]').click();document.querySelector('.catalog').scrollIntoView({behavior:'smooth'});};
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>libraryButton.setAttribute('aria-pressed',String(view==='saved'))));
  const theme=document.querySelector('#toolbar-theme');
  function themeUI(dark){document.documentElement.classList.toggle('dark-theme',dark);theme.setAttribute('aria-pressed',String(dark));theme.querySelector('span').textContent=dark?'Tema claro':'Tema oscuro';}
  try{themeUI(localStorage.getItem('rumbo-theme')==='dark');}catch{}
  theme.onclick=()=>{const dark=!document.documentElement.classList.contains('dark-theme');themeUI(dark);try{localStorage.setItem('rumbo-theme',dark?'dark':'light');}catch{}};
  document.querySelector('#toolbar-help').onclick=()=>{
    document.querySelector('#detail-content').innerHTML='<p class="eyebrow">GUÍA DE RUMBO</p><h2>Encuentra tu colectiva sin dar vueltas.</h2><p><b>Buscar:</b> escribe el número de ruta, una colonia o una calle. El mapa muestra solo las rutas que coinciden.</p><p><b>¿Qué pasa cerca?:</b> toca el mapa o usa tu ubicación para ver qué rutas pasan dentro del radio elegido.</p><p><b>Trazar una ruta:</b> toca el mapa siguiendo las calles en el orden del recorrido y luego llena sus datos. Puedes editar, volver a trazar u ocultar cualquier ruta.</p><p><b>Tus datos:</b> las rutas capturadas y Mis rutas se guardan en este navegador. Exporta rutas.json para respaldarlas, pasarlas a otro equipo o reemplazar el archivo de la aplicación.</p><p class="author">Las rutas marcadas como EJEMPLO son trazos ilustrativos. Rumbo no es información oficial.</p>';
    document.querySelector('#detail').showModal();
  };
  function text(r){return (r.code?'Ruta '+r.code+' · ':'')+r.name+'\n'+describe(r)+(r.hours?'\nHorario: '+r.hours:'');}
  function download(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const status=document.querySelector('#share-status');
  function reportError(error){status.textContent=error.name==='AbortError'?'Se canceló el envío.':'No se pudo compartir. '+(error.message||'Intenta de nuevo.');}
  document.querySelector('#share-text').onclick=async()=>{
    const r=selectedRoute();if(!r)return;status.textContent='';
    try{
      if(navigator.share){await navigator.share({title:r.name,text:text(r)});status.textContent='Ruta entregada al sistema para compartir.';}
      else if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text(r));status.textContent='El menú de compartir no está disponible. Ruta copiada.';}
      else{status.textContent=text(r);}
    }catch(error){reportError(error);}
  };
  function capture(r){
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=620;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo generar la imagen.');
    ctx.fillStyle='#f7f4ed';ctx.fillRect(0,0,900,620);
    ctx.fillStyle='#e9e5db';ctx.fillRect(40,40,340,400);
    // Ajusta el trazo al recuadro conservando la proporción local de latitud y longitud.
    const k=Math.cos(r.points[0][0]*Math.PI/180),xs=r.points.map(p=>p[1]*k),ys=r.points.map(p=>-p[0]);
    const minX=Math.min(...xs),minY=Math.min(...ys),scale=Math.min(280/((Math.max(...xs)-minX)||1e-9),340/((Math.max(...ys)-minY)||1e-9));
    const pt=i=>[70+(xs[i]-minX)*scale,70+(ys[i]-minY)*scale];
    ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.lineWidth=14;ctx.beginPath();r.points.forEach((_,i)=>ctx[i?'lineTo':'moveTo'](...pt(i)));ctx.stroke();
    ctx.strokeStyle=r.color;ctx.lineWidth=8;ctx.stroke();
    for(const [i,fill] of [[0,'#fff'],[r.points.length-1,r.color]]){ctx.beginPath();ctx.arc(...pt(i),9,0,7);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=i?'#fff':r.color;ctx.stroke();}
    function wrap(value,x,y,width,font,color,lineHeight){ctx.font=font;ctx.fillStyle=color;let line='';for(const word of value.split(/\s+/)){if(line&&ctx.measureText(line+' '+word).width>width){ctx.fillText(line,x,y);y+=lineHeight;line=word;}else line+=(line?' ':'')+word;}ctx.fillText(line,x,y);return y+lineHeight;}
    ctx.fillStyle='#1f6f63';ctx.font='bold 20px Arial';ctx.fillText('RUMBO · COLECTIVAS DE TULANCINGO',420,80);
    const y=wrap((r.code?r.code+' · ':'')+r.name,420,140,440,'bold 36px Arial','#252620',42);
    const after=wrap(describe(r),420,y+12,440,'20px Arial','#454840',28);
    if(r.hours)wrap('Horario: '+r.hours,420,after+12,440,'18px Arial','#64685e',24);
    ctx.fillStyle='#252620';ctx.font='16px Arial';ctx.fillText('Trazo aproximado de '+(geo.length(r.points)/1000).toFixed(1)+' km. Confirma con la base de la ruta.',40,500);
    ctx.font='12px Arial';ctx.fillStyle='#64685e';ctx.fillText(r.source==='ejemplo'?'Ruta de EJEMPLO: trazo ilustrativo, no es un recorrido real.':'Información capturada por personas usuarias. No es información oficial.',40,595);
    const data=atob(canvas.toDataURL('image/png').split(',')[1]);
    return new File([Uint8Array.from(data,c=>c.charCodeAt(0))],'rumbo-ruta.png',{type:'image/png'});
  }
  document.querySelector('#share-capture').onclick=async()=>{const r=selectedRoute();if(!r)return;status.textContent='';try{const file=capture(r);if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:r.name,files:[file]});status.textContent='Imagen entregada al sistema para compartir.';}else{download(file);status.textContent='Se descargó la imagen PNG. El navegador no permite compartir imágenes directamente.';}}catch(error){reportError(error);}};
  const url=new URL(location.href);
  if(['title','text','url'].some(key=>url.searchParams.has(key))){
    const received=document.querySelector('#received');received.hidden=false;
    received.querySelector('pre').textContent=['title','text','url'].map(key=>url.searchParams.get(key)).filter(Boolean).join('\n\n')||'Contenido vacío.';
    ['title','text','url'].forEach(key=>url.searchParams.delete(key));
    history.replaceState(null,'',url.pathname+url.search+url.hash);
    received.scrollIntoView({block:'center'});
  }
  document.querySelector('#received-close').onclick=()=>{document.querySelector('#received').hidden=true;};
  refresh();
})();
