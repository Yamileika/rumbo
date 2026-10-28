let routes=[],saved=new Set(),tab='routes',selectedId=null,nearPoint=null,radius=400;
const normalize=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const routeById=id=>routes.find(r=>r.id===id);
const selectedRoute=()=>routeById(selectedId)||routes[0]||null;
function filtered(){const q=normalize($('#search').value.trim());return routes.filter(r=>(tab!=='saved'||saved.has(r.id))&&(!q||normalize([r.code,r.name,r.from,r.to,r.via.join(' '),r.stops.map(s=>s.name).join(' '),r.notes].join(' ')).includes(q)));}
function persistSaved(){try{localStorage.setItem('rumbo-favorites',JSON.stringify([...saved]));}catch{toast('No se pudo guardar en este navegador.');}}

$('#search-icon').outerHTML=icon('search');
$('#about').innerHTML=icon('info');$('#install').innerHTML=icon('install');$('#about-close').innerHTML=icon('close');
$('#layer').innerHTML=icon('layers')+'<span>Satélite</span>';$('#recenter').innerHTML=icon('locate');$('#locate').innerHTML=icon('locate')+'Usar mi ubicación';

const {map,toggleSatellite}=createMap('map');
const routeLayer=L.layerGroup().addTo(map),nearLayer=L.layerGroup().addTo(map);
const mobile=matchMedia('(max-width: 760px)');
// Deja libre la zona que tapa el panel al encuadrar una ruta.
function padding(){return mobile.matches?{paddingTopLeft:[30,30],paddingBottomRight:[30,$('#sheet').offsetHeight+20]}:{paddingTopLeft:[$('#sheet').offsetWidth+50,40],paddingBottomRight:[70,40]};}
function fit(points){if(points.length)map.fitBounds(L.latLngBounds(points),{...padding(),maxZoom:16});}
$('#recenter').onclick=()=>{const all=filtered().flatMap(r=>r.points);all.length?fit(all):map.setView(CENTER,14);};
$('#layer').onclick=()=>{const on=toggleSatellite();$('#layer').setAttribute('aria-pressed',String(on));$('#layer span').textContent=on?'Mapa':'Satélite';};

function drawMap(){
 routeLayer.clearLayers();
 const list=tab==='near'?routes:filtered(),selected=routeById(selectedId);
 for(const r of list){if(r===selected)continue;L.polyline(r.points,{color:r.color,weight:5,opacity:selected?.25:.85,dashArray:r.source==='ejemplo'?'2 10':null,lineCap:'round'}).bindTooltip((r.code?r.code+' · ':'')+r.name,{sticky:true,className:'route-tip'}).on('click',()=>openRoute(r.id)).addTo(routeLayer);}
 if(selected){
  L.polyline(selected.points,{color:'#fff',weight:12,opacity:.95,interactive:false,lineCap:'round'}).addTo(routeLayer);
  const line=L.polyline(selected.points,{color:selected.color,weight:7,dashArray:selected.source==='ejemplo'?'2 12':null,lineCap:'round',className:selected.source==='ejemplo'?'':'route-draw'}).addTo(routeLayer);
  line.getElement?.()?.setAttribute('pathLength','1');
  for(const s of selected.stops)L.circleMarker(s.point,{radius:5,color:selected.color,weight:3,fillColor:'#fff',fillOpacity:1}).bindTooltip(s.name,{className:'route-tip'}).addTo(routeLayer);
  const end=(p,label,start)=>L.marker(p,{icon:L.divIcon({className:'end-pin',html:'<span style="--c:'+selected.color+'" class="'+(start?'start':'finish')+'">'+(start?'A':'B')+'</span>',iconSize:[28,28],iconAnchor:[14,14]})}).bindTooltip(label,{className:'route-tip',direction:'top',offset:[0,-12]}).addTo(routeLayer);
  end(selected.points[0],'Sale: '+(selected.from||'inicio'),true);end(selected.points.at(-1),'Llega: '+(selected.to||'final'),false);
 }
}
// Dibuja la forma de la ruta en un SVG pequeño, conservando la proporción local.
function shape(points,w,h,pad){
 const k=Math.cos(points[0][0]*Math.PI/180),xs=points.map(p=>p[1]*k),ys=points.map(p=>-p[0]);
 const minX=Math.min(...xs),minY=Math.min(...ys),sw=Math.max(...xs)-minX||1e-9,sh=Math.max(...ys)-minY||1e-9,sc=Math.min((w-2*pad)/sw,(h-2*pad)/sh);
 const ox=(w-sw*sc)/2,oy=(h-sh*sc)/2;
 return points.map((p,i)=>(i?'L':'M')+(ox+(xs[i]-minX)*sc).toFixed(1)+' '+(oy+(ys[i]-minY)*sc).toFixed(1)).join('');
}
const thumb=r=>'<svg class="thumb" viewBox="0 0 64 48" aria-hidden="true"><path d="'+shape(r.points,64,48,7)+'" fill="none" stroke="'+r.color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"'+(r.source==='ejemplo'?' stroke-dasharray="1 5"':'')+'/></svg>';
const VAN='<svg class="van" viewBox="0 0 220 120" aria-hidden="true"><ellipse cx="112" cy="108" rx="96" ry="7" fill="#0f766e" opacity=".12"/><path d="M22 86V48c0-14 10-26 26-28l98-4c16 0 28 6 38 18l14 18c4 5 6 10 6 16v18c0 5-4 9-9 9H31c-5 0-9-4-9-9Z" fill="#fff" stroke="#0f766e" stroke-width="4"/><path d="M22 70h178v14c0 3-2 6-6 6H28c-3 0-6-3-6-6Z" fill="#14b8a6"/><path d="M40 30h28v26H34V36c0-3 3-6 6-6ZM76 29h30v27H76ZM114 28h30v28h-30ZM152 28c8 0 15 4 20 11l9 17h-29Z" fill="#ccfbf1" stroke="#0f766e" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="94" r="15" fill="#0f172a"/><circle cx="60" cy="94" r="6" fill="#e2e8f0"/><circle cx="168" cy="94" r="15" fill="#0f172a"/><circle cx="168" cy="94" r="6" fill="#e2e8f0"/><rect x="190" y="62" width="10" height="7" rx="2" fill="#fbbf24"/><text x="104" y="83" font-family="inherit" font-size="11" font-weight="800" fill="#fff" letter-spacing="1">RUMBO</text></svg>';
const badge=(r,cls='')=>'<span class="badge '+cls+'" style="--c:'+r.color+'">'+esc(r.code||'·')+'</span>';
const routeItem=(r,meta)=>'<li><button type="button" class="route" style="--c:'+r.color+'" data-open="'+esc(r.id)+'">'+badge(r)+'<span class="route-text"><b>'+esc(r.name)+'</b><small>'+esc([r.from,r.to].filter(Boolean).join(' → ')||'Sin origen ni destino')+'</small><span class="route-meta">'+(meta?'<strong>'+meta+'</strong>':km(geo.length(r.points)))+(r.stops.length?' · '+r.stops.length+(r.stops.length===1?' parada':' paradas'):'')+(r.source==='ejemplo'?'<em>Ejemplo</em>':'')+'</span></span>'+thumb(r)+'</button><button type="button" class="star" data-star="'+esc(r.id)+'" aria-pressed="'+saved.has(r.id)+'" aria-label="'+(saved.has(r.id)?'Quitar de':'Agregar a')+' guardadas">'+icon('star')+'</button></li>';
function renderList(){
 const list=filtered();
 $('#count').textContent=saved.size;$('#count').hidden=!saved.size;
 $('#results').textContent=tab==='saved'?(list.length?'Tus rutas guardadas':''):list.length+(list.length===1?' ruta':' rutas')+' en Tulancingo';
 $('#list').innerHTML=list.map(r=>routeItem(r)).join('');
 const welcome=tab==='routes'&&!$('#search').value.trim()&&routes.length>0;
 $('#welcome').hidden=!welcome;
 if(welcome){const stops=routes.reduce((n,r)=>n+r.stops.length,0),total=routes.reduce((n,r)=>n+geo.length(r.points),0);
  $('#welcome').innerHTML='<div class="welcome-text"><p class="eyebrow">Tulancingo, Hgo.</p><h2>¿A dónde vas hoy?</h2><p>Elige una ruta para ver por dónde pasa.</p></div>'+VAN+'<div class="stats"><div><b>'+routes.length+'</b><small>'+(routes.length===1?'ruta':'rutas')+'</small></div><div><b>'+stops+'</b><small>paradas</small></div><div><b>'+Math.round(total/1000)+'</b><small>km de rutas</small></div></div>';}
 $('#empty').hidden=list.length>0;
 $('#empty').innerHTML=tab==='saved'&&!$('#search').value?icon('star')+'<p><b>Aún no guardas rutas.</b><br>Toca la estrella de una ruta para tenerla aquí.</p>':icon('search')+'<p><b>Sin resultados.</b><br>Prueba con el número de la ruta o el nombre de una colonia.</p>';
 const examples=routes.some(r=>r.source==='ejemplo');
 $('#example-note').hidden=!examples||tab!=='routes';
 $('#example-note').innerHTML='<b>Rutas de ejemplo.</b> Las líneas punteadas son trazos ilustrativos mientras se capturan los recorridos reales.';
}
function renderNear(){
 if(!nearPoint){$('#near-list').innerHTML='';return;}
 const found=geo.near(nearPoint,routes,radius);
 $('#near-list').innerHTML=found.length?found.map(f=>routeItem(f.route,'a '+km(f.meters))).join(''):'<li class="empty">'+icon('pin')+'<p><b>Ninguna ruta a menos de '+radius+' m.</b><br>Prueba con una distancia mayor.</p></li>';
 nearLayer.clearLayers();
 L.circle(nearPoint,{radius,color:'#0f766e',weight:1.5,fillOpacity:.08,interactive:false,className:'near-circle'}).addTo(nearLayer);
 L.marker(nearPoint,{icon:L.divIcon({className:'me-pin',html:'<span></span>',iconSize:[22,22],iconAnchor:[11,11]}),interactive:false}).addTo(nearLayer);
}
function renderDetail(){
 const r=routeById(selectedId);if(!r)return;
 const facts=[['route','Recorrido',km(geo.length(r.points))],['stop','Paradas',r.stops.length?String(r.stops.length):''],['cash','Tarifa',r.fare],['repeat','Frecuencia',r.frequency],['clock','Horario',r.hours]].filter(f=>f[2]);
 const stops=[{name:r.from||'Inicio',kind:'start'},...(r.stops.length?r.stops.map(s=>({name:s.name})):r.via.map(v=>({name:v,kind:'via'}))),{name:r.to||'Final',kind:'end'}];
 $('#pane-detail').innerHTML='<button type="button" class="back" data-back>'+icon('back')+'Todas las rutas</button>'+
  '<div class="route-hero" style="--c:'+r.color+'"><svg class="hero-shape" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="'+shape(r.points,360,150,22)+'" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'+(r.source==='ejemplo'?' stroke-dasharray="1 9"':'')+'/></svg>'+
  '<div class="route-hero-text">'+badge(r,'big')+'<div><p class="kicker">'+(r.source==='oficial'?icon('stop')+' ':'')+sourceLabel[r.source]+'</p><h2>'+esc(r.name)+'</h2><p>'+esc([r.from,r.to].filter(Boolean).join('  →  '))+'</p></div></div></div>'+
  '<div class="facts">'+facts.map((f,i)=>'<div class="fact'+(i>3||f[0]==='clock'?' wide':'')+'">'+icon(f[0])+'<span><small>'+f[1]+'</small><b>'+esc(f[2])+'</b></span></div>').join('')+'</div>'+
  '<div class="actions"><button type="button" class="btn '+(saved.has(r.id)?'on':'')+'" data-star="'+esc(r.id)+'" aria-pressed="'+saved.has(r.id)+'">'+icon('star')+(saved.has(r.id)?'Guardada':'Guardar')+'</button><button type="button" class="btn" data-share>'+icon('share')+'Compartir</button><button type="button" class="btn" data-image>'+icon('image')+'Imagen</button></div>'+
  '<h3 class="pane-label">Recorrido</h3><ol class="timeline" style="--c:'+r.color+'">'+stops.map(s=>'<li class="'+(s.kind||'')+'"><span>'+esc(s.name)+'</span>'+(s.kind==='start'?'<small>Salida</small>':s.kind==='end'?'<small>Llegada</small>':'')+'</li>').join('')+'</ol>'+
  (r.notes?'<p class="notes">'+esc(r.notes)+'</p>':'')+
  (r.source==='ejemplo'?'<div class="callout"><b>Trazo ilustrativo.</b> No es el recorrido real de ninguna ruta.</div>':r.source==='capturada'?'<p class="fine">Recorrido capturado por la administración de Rumbo. Confirma con la base de la ruta.</p>':'');
}
function show(pane){for(const id of ['list','near','detail']){const el=$('#pane-'+id);el.hidden=id!==pane;if(id===pane){el.classList.remove('enter');void el.offsetWidth;el.classList.add('enter');}}$('#sheet-body').scrollTop=0;}
function setTab(next){
 tab=next;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
 selectedId=null;nearLayer.clearLayers();
 if(tab==='near'){show('near');renderNear();}else{show('list');renderList();}
 $('#map').classList.toggle('picking',tab==='near');drawMap();publish();
}
function openRoute(id){
 const r=routeById(id);if(!r)return;selectedId=id;renderDetail();show('detail');drawMap();fit(r.points);publish();
 $('#sheet').classList.remove('expanded');
}
function toggleSaved(id){saved.has(id)?saved.delete(id):saved.add(id);persistSaved();toast(saved.has(id)?'Ruta guardada':'Ruta quitada de guardadas');renderList();if(nearPoint)renderNear();if(selectedId)renderDetail();publish();}
$('#sheet').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.star)return toggleSaved(b.dataset.star);
 if(b.dataset.open)return openRoute(b.dataset.open);
 if(b.dataset.tab)return setTab(b.dataset.tab);
 if('back' in b.dataset){selectedId=null;show(tab==='near'?'near':'list');drawMap();publish();return;}
 if('share' in b.dataset)return shareText(routeById(selectedId));
 if('image' in b.dataset)return shareImage(routeById(selectedId));
 if(b.dataset.radius){radius=Number(b.dataset.radius);document.querySelectorAll('[data-radius]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderNear();}
});
$('#search').addEventListener('input',()=>{if(tab==='near')setTab('routes');else{selectedId=null;show('list');renderList();drawMap();}});
$('#grabber').onclick=()=>$('#sheet').classList.toggle('expanded');
map.on('click',e=>{if(tab!=='near')return;nearPoint=[e.latlng.lat,e.latlng.lng];selectedId=null;show('near');renderNear();drawMap();});
$('#locate').onclick=()=>{
 if(!navigator.geolocation)return toast('Este navegador no permite obtener tu ubicación.');
 $('#locate').disabled=true;
 navigator.geolocation.getCurrentPosition(pos=>{$('#locate').disabled=false;nearPoint=[pos.coords.latitude,pos.coords.longitude];map.setView(nearPoint,16);renderNear();},err=>{$('#locate').disabled=false;toast(err.code===1?'Permiso de ubicación denegado. Toca el mapa para elegir un punto.':'No se pudo obtener tu ubicación. Toca el mapa para elegir un punto.');},{enableHighAccuracy:true,timeout:10000});
};
$('#about').onclick=()=>$('#about-dialog').showModal();$('#about-close').onclick=()=>$('#about-dialog').close();

function describe(r){return [r.from&&r.to?r.from+' → '+r.to:r.from||r.to,r.stops.length?'Paradas: '+r.stops.map(s=>s.name).join(', '):r.via.length?'Pasa por '+r.via.join(', '):'',r.fare&&'Tarifa '+r.fare,r.hours&&'Horario '+r.hours].filter(Boolean).join('\n');}
async function shareText(r){
 const text=(r.code?'Ruta '+r.code+' · ':'')+r.name+'\n'+describe(r);
 try{if(navigator.share)await navigator.share({title:r.name,text});else if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(text);toast('Ruta copiada al portapapeles.');}else toast(text);}
 catch(error){if(error.name!=='AbortError')toast('No se pudo compartir.');}
}
function drawCard(r){
 const c=document.createElement('canvas');c.width=1080;c.height=1080;const x=c.getContext('2d');if(!x)throw Error('No se pudo generar la imagen.');
 const font='"Segoe UI",Arial,sans-serif';
 x.fillStyle='#f1f5f4';x.fillRect(0,0,1080,1080);
 x.fillStyle='#fff';x.beginPath();x.roundRect(60,60,960,600,36);x.fill();
 const k=Math.cos(r.points[0][0]*Math.PI/180),xs=r.points.map(p=>p[1]*k),ys=r.points.map(p=>-p[0]),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX||1e-9,h=Math.max(...ys)-minY||1e-9,s=Math.min(840/w,480/h);
 const pt=i=>[540+(xs[i]-minX-w/2)*s,360+(ys[i]-minY-h/2)*s];
 x.lineCap=x.lineJoin='round';x.beginPath();r.points.forEach((_,i)=>x[i?'lineTo':'moveTo'](...pt(i)));x.strokeStyle='#e2e8f0';x.lineWidth=30;x.stroke();x.strokeStyle=r.color;x.lineWidth=14;x.stroke();
 for(const [i,label] of [[0,'A'],[r.points.length-1,'B']]){const [px,py]=pt(i);x.beginPath();x.arc(px,py,24,0,7);x.fillStyle=i?r.color:'#fff';x.fill();x.lineWidth=6;x.strokeStyle=i?'#fff':r.color;x.stroke();x.fillStyle=i?'#fff':r.color;x.font='bold 22px '+font;x.textAlign='center';x.textBaseline='middle';x.fillText(label,px,py+1);}
 x.textAlign='left';x.textBaseline='alphabetic';
 x.fillStyle=r.color;x.beginPath();x.roundRect(60,710,120,120,28);x.fill();x.fillStyle='#fff';x.font='bold 56px '+font;x.textAlign='center';x.fillText(r.code||'·',120,790);x.textAlign='left';
 const wrap=(text,y,size,color,weight='')=>{x.font=weight+' '+size+'px '+font;x.fillStyle=color;let line='';for(const word of text.split(/\s+/)){if(line&&x.measureText(line+' '+word).width>780){x.fillText(line,210,y);y+=size*1.25;line=word;}else line+=(line?' ':'')+word;}x.fillText(line,210,y);return y+size*1.25;};
 let y=wrap(r.name,750,44,'#0f172a','bold');y=wrap([r.from,r.to].filter(Boolean).join(' → '),y+4,30,'#475569');
 if(r.fare||r.hours)wrap([r.fare&&'Tarifa '+r.fare,r.hours].filter(Boolean).join(' · '),y+4,26,'#64748b');
 x.fillStyle='#0f766e';x.font='bold 28px '+font;x.fillText('Rumbo · Colectivas de Tulancingo',60,1010);
 x.fillStyle='#64748b';x.font='22px '+font;x.textAlign='right';x.fillText(r.source==='ejemplo'?'Trazo de ejemplo':km(geo.length(r.points))+' de recorrido',1020,1010);
 return new Promise(ok=>c.toBlob(b=>ok(new File([b],'rumbo-'+(r.code||'ruta')+'.png',{type:'image/png'})),'image/png'));
}
async function shareImage(r){
 try{const file=await drawCard(r);
  if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({title:r.name,files:[file]});
  else{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Imagen descargada.');}
 }catch(error){if(error.name!=='AbortError')toast('No se pudo crear la imagen.');}
}
function publish(){window.dispatchEvent(new Event('rumbo-change'));}

let installPrompt;
const standalone=matchMedia('(display-mode: standalone)'),overlay=matchMedia('(display-mode: window-controls-overlay)');
// El botón de la barra siempre está a la vista en el navegador; dentro de la app instalada se oculta.
function installUI(){const inApp=standalone.matches||overlay.matches;$('#tb-install').hidden=inApp;$('#install').hidden=inApp||!installPrompt;}
standalone.addEventListener('change',installUI);overlay.addEventListener('change',installUI);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installUI();});
async function install(){
 if(!installPrompt)return toast(location.protocol==='file:'?'Abre Rumbo desde node server.js (localhost) para instalarla.':'Si ya la instalaste, ábrela desde el menú Inicio. Si no, en Edge abre el menú … → Aplicaciones → Instalar este sitio como aplicación.');
 try{await installPrompt.prompt();await installPrompt.userChoice;}catch{toast('Intenta instalar desde el menú del navegador.');}finally{installPrompt=null;installUI();}
}
$('#install').onclick=install;$('#tb-install').onclick=install;
window.addEventListener('appinstalled',()=>{installPrompt=null;installUI();toast('Rumbo quedó instalada.');});
installUI();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Barra superior (también se integra a la barra de título con window-controls-overlay).
document.querySelectorAll('[data-icon]').forEach(el=>el.outerHTML=icon(el.dataset.icon));
const topSearch=$('#toolbar-search');
topSearch.addEventListener('input',()=>{$('#search').value=topSearch.value;$('#search').dispatchEvent(new Event('input'));});
$('#search').addEventListener('input',()=>{if(topSearch.value!==$('#search').value)topSearch.value=$('#search').value;});
$('#tb-near').onclick=()=>setTab(tab==='near'?'routes':'near');
$('#tb-saved').onclick=()=>setTab(tab==='saved'?'routes':'saved');
$('#tb-help').onclick=()=>$('#about-dialog').showModal();
$('#tb-share').onclick=()=>{const r=routeById(selectedId);r?shareText(r):shareApp();};
window.addEventListener('rumbo-change',()=>{$('#tb-near').setAttribute('aria-pressed',String(tab==='near'));$('#tb-saved').setAttribute('aria-pressed',String(tab==='saved'));});

// Sección de compartir: usa la ruta abierta o la primera de la lista.
$('#share-route').innerHTML=icon('share')+'Compartir ruta';$('#share-image').innerHTML=icon('image')+'Imagen del recorrido';$('#share-app').innerHTML=icon('share')+'Compartir la aplicación Rumbo';
function renderShare(){const r=selectedRoute();$('#share-card').hidden=!r;if(!r)return;$('#share-card').style.setProperty('--c',r.color);$('#share-title').textContent=(r.code?r.code+' · ':'')+r.name;$('#share-desc').textContent=describe(r).replace(/\n/g,' · ');}
window.addEventListener('rumbo-change',renderShare);
$('#share-route').onclick=()=>shareText(selectedRoute());$('#share-image').onclick=()=>shareImage(selectedRoute());$('#share-app').onclick=shareApp;
async function shareApp(){
 const data={title:'Rumbo · Colectivas de Tulancingo',text:'Mira por dónde pasan las colectivas de Tulancingo.',url:location.origin+location.pathname};
 try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(data.text+' '+data.url);toast('Enlace copiado al portapapeles.');}else toast(data.url);}
 catch(error){if(error.name!=='AbortError')toast('No se pudo compartir.');}
}

// share_target: muestra lo que otra aplicación compartió con Rumbo.
const shared=new URL(location.href);
if(['title','text','url'].some(k=>shared.searchParams.has(k))){
 $('#received').hidden=false;$('#received pre').textContent=['title','text','url'].map(k=>shared.searchParams.get(k)).filter(Boolean).join('\n\n')||'Contenido vacío.';
 ['title','text','url'].forEach(k=>shared.searchParams.delete(k));history.replaceState(null,'',shared.pathname+shared.search);
}
$('#received-close').innerHTML=icon('close');$('#received-close').onclick=()=>{$('#received').hidden=true;};

(async()=>{
 try{saved=new Set(JSON.parse(localStorage.getItem('rumbo-favorites')||'[]'));}catch{}
 try{routes=geo.validate(await (await fetch('rutas.json',{cache:'no-cache'})).json());}catch{toast('Todavía no hay rutas publicadas.');}
 routes.sort((a,b)=>a.code.localeCompare(b.code,'es',{numeric:true})||a.name.localeCompare(b.name,'es'));
 renderList();drawMap();publish();
 const all=routes.flatMap(r=>r.points);if(all.length)fit(all);
 if(new URLSearchParams(location.search).get('tab')==='near')setTab('near');
})();
