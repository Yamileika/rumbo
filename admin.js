const PALETTE=['#0f766e','#2563eb','#dc2626','#d97706','#7c3aed','#db2777','#059669','#0891b2','#65a30d','#475569'];
const DRAFT='rumbo-admin-draft';
let routes=[],current=null,tool='trace',dirty=false,undoStack=[],queue=Promise.resolve();

$('#publish').innerHTML=icon('upload')+'Publicar';$('#new-route').innerHTML=icon('plus')+'Nueva ruta';$('#import').innerHTML=icon('upload');$('#export').innerHTML=icon('download');
$('#back').innerHTML=icon('back')+'Todas las rutas';$('#undo').innerHTML=icon('undo')+'Deshacer';$('#reverse').innerHTML=icon('swap')+'Invertir sentido';$('#clear-trace').innerHTML=icon('trash')+'Borrar trazo';$('#delete-route').innerHTML=icon('trash')+'Eliminar ruta';
$('#layer').innerHTML=icon('layers')+'<span>Satélite</span>';$('#fit').innerHTML=icon('route');
$('#trace-hint').innerHTML='<b>Toca el mapa</b> en el orden del recorrido: salida, cada vuelta y llegada. Arrastra un punto para moverlo, tócalo para quitarlo y toca la línea para agregar un punto en medio.';

const {map,toggleSatellite}=createMap('map');
const others=L.layerGroup().addTo(map),editLayer=L.layerGroup().addTo(map);
$('#layer').onclick=()=>{const on=toggleSatellite();$('#layer').setAttribute('aria-pressed',String(on));$('#layer span').textContent=on?'Mapa':'Satélite';};
const mobile=matchMedia('(max-width: 760px)');
function fit(points){if(!points.length)return;map.fitBounds(L.latLngBounds(points),mobile.matches?{paddingTopLeft:[30,30],paddingBottomRight:[30,$('#sheet').offsetHeight+20],maxZoom:17}:{paddingTopLeft:[$('#sheet').offsetWidth+50,40],paddingBottomRight:[70,40],maxZoom:17});}
$('#fit').onclick=()=>fit(current?.points.length?current.points:routes.flatMap(r=>r.points));
$('#grabber').onclick=()=>$('#sheet').classList.toggle('expanded');

// Cada ruta en edición guarda puntos de control (waypoints) y el tramo calculado entre cada par (legs).
function prepare(r){
 const route={code:'',name:'',from:'',to:'',via:[],fare:'',hours:'',frequency:'',notes:'',color:PALETTE[0],source:'capturada',stops:[],points:[],...structuredClone(r)};
 if(!route.waypoints||route.waypoints.length<2)route.waypoints=route.points.length>=2?route.points.slice():[];
 if(!route.legs||route.legs.length!==route.waypoints.length-1)route.legs=route.waypoints.slice(1).map((p,i)=>[route.waypoints[i],p]);
 return route;
}
function rebuild(r){r.points=r.legs.length?r.legs.flatMap((leg,i)=>i?leg.slice(1):leg):r.waypoints.slice();r.stops=geo.sortStops(r.stops,r.points.length>1?r.points:r.waypoints);}
function serialize(r){const {id,code,name,from,to,via,fare,hours,frequency,notes,color,source,stops,waypoints,legs,points}=r;return {id,code,name,from,to,via,fare,hours,frequency,notes,color,source,stops,waypoints,legs,points};}
function save(){dirty=true;try{localStorage.setItem(DRAFT,JSON.stringify(routes.map(serialize)));}catch{toast('No se pudo guardar el borrador en este navegador.');}status();}
function status(){$('#publish-bar').classList.toggle('dirty',dirty);$('#publish-state').textContent=dirty?'Cambios sin publicar':'Todo publicado';$('#publish').disabled=!dirty;}

async function streetPath(a,b){
 if(!$('#snap').checked)return [a,b];
 $('#busy').hidden=false;
 try{
  const res=await fetch('https://router.project-osrm.org/route/v1/driving/'+a[1]+','+a[0]+';'+b[1]+','+b[0]+'?overview=full&geometries=geojson');
  const data=await res.json();if(data.code!=='Ok')throw Error(data.code);
  const pts=data.routes[0].geometry.coordinates.map(([lng,lat])=>[+lat.toFixed(6),+lng.toFixed(6)]);
  return pts.length>=2?pts:[a,b];
 }catch{toast('No se pudo calcular el camino por las calles; se usó una línea recta. Puedes ajustarla con más puntos.');return [a,b];}
 finally{$('#busy').hidden=true;}
}
// Las ediciones del trazo se encadenan para que dos clics rápidos no calculen tramos desordenados.
function edit(fn){queue=queue.then(async()=>{const r=current;if(!r)return;undoStack.push(JSON.stringify({w:r.waypoints,l:r.legs,s:r.stops}));if(undoStack.length>50)undoStack.shift();await fn(r);rebuild(r);save();drawEditor();renderTrace();renderStops();}).catch(()=>toast('No se pudo aplicar el cambio.'));}
const addPoint=p=>edit(async r=>{const last=r.waypoints.at(-1);r.waypoints.push(p);if(last)r.legs.push(await streetPath(last,p));});
const movePoint=(i,p)=>edit(async r=>{r.waypoints[i]=p;if(i>0)r.legs[i-1]=await streetPath(r.waypoints[i-1],p);if(i<r.waypoints.length-1)r.legs[i]=await streetPath(p,r.waypoints[i+1]);});
const removePoint=i=>edit(async r=>{
 const n=r.waypoints.length;r.waypoints.splice(i,1);
 if(n===1)return;if(i===0)r.legs.shift();else if(i===n-1)r.legs.pop();else r.legs.splice(i-1,2,await streetPath(r.waypoints[i-1],r.waypoints[i]));
});
const insertPoint=p=>edit(async r=>{
 let best=Infinity,k=0;r.legs.forEach((leg,i)=>{const d=geo.toRoute(p,leg);if(d<best){best=d;k=i;}});
 r.waypoints.splice(k+1,0,p);r.legs.splice(k,1,await streetPath(r.waypoints[k],p),await streetPath(p,r.waypoints[k+2]));
});

function drawOthers(){others.clearLayers();for(const r of routes)if(r!==current&&r.points.length>1)L.polyline(r.points,{color:r.color,weight:4,opacity:current?.22:.85,interactive:!current}).bindTooltip((r.code?r.code+' · ':'')+(r.name||'Sin nombre'),{sticky:true,className:'route-tip'}).on('click',()=>openEditor(r.id)).addTo(others);}
function drawEditor(){
 editLayer.clearLayers();const r=current;if(!r)return;
 if(r.points.length>1){
  L.polyline(r.points,{color:'#fff',weight:11,opacity:.9,interactive:false,lineCap:'round'}).addTo(editLayer);
  L.polyline(r.points,{color:r.color,weight:6,lineCap:'round',className:tool==='trace'?'insertable':''}).on('click',e=>{if(tool!=='trace')return;L.DomEvent.stop(e);insertPoint([+e.latlng.lat.toFixed(6),+e.latlng.lng.toFixed(6)]);}).bindTooltip(tool==='trace'?'Toca para agregar un punto aquí':'',{sticky:true,className:'route-tip'}).addTo(editLayer);
 }
 if(tool==='trace')r.waypoints.forEach((p,i)=>{
  const end=i===0||i===r.waypoints.length-1;
  const m=L.marker(p,{draggable:true,autoPan:true,zIndexOffset:end?1000:500,icon:L.divIcon({className:'wp'+(end?' end'+(i?' finish':''):''),html:'<span style="--c:'+r.color+'">'+(end?(i?'B':'A'):'')+'</span>',iconSize:end?[24,24]:[16,16],iconAnchor:end?[12,12]:[8,8]})}).bindTooltip(end?(i?'Llegada':'Salida')+' · arrastra para mover':'Arrastra para mover · toca para quitar',{direction:'top',offset:[0,-10],className:'route-tip'}).addTo(editLayer);
  m.on('dragend',()=>{const ll=m.getLatLng();movePoint(i,[+ll.lat.toFixed(6),+ll.lng.toFixed(6)]);});
  m.on('click',e=>{L.DomEvent.stop(e);removePoint(i);});
 });
 r.stops.forEach((s,i)=>{
  const m=L.marker(s.point,{draggable:tool==='stops',zIndexOffset:2000,icon:L.divIcon({className:'stop-pin',html:'<span style="--c:'+r.color+'">'+(i+1)+'</span>',iconSize:[24,24],iconAnchor:[12,12]})}).bindTooltip(s.name,{direction:'top',offset:[0,-12],className:'route-tip'}).addTo(editLayer);
  m.on('dragend',()=>{const ll=m.getLatLng();edit(r=>{r.stops[i].point=[+ll.lat.toFixed(6),+ll.lng.toFixed(6)];});});
  m.on('click',e=>{L.DomEvent.stop(e);if(tool!=='stops')setTool('stops');document.querySelectorAll('#stop-list input')[i]?.focus();});
 });
}
map.on('click',e=>{
 if(!current)return;const p=[+e.latlng.lat.toFixed(6),+e.latlng.lng.toFixed(6)];
 if(tool==='trace')addPoint(p);
 if(tool==='stops')edit(r=>{r.stops.push({name:'Parada '+(r.stops.length+1),point:p});});
});

const routeBadge=r=>'<span class="badge" style="--c:'+r.color+'">'+esc(r.code||'·')+'</span>';
function renderList(){
 $('#list-label').textContent=routes.length+(routes.length===1?' ruta':' rutas');
 $('#list').innerHTML=routes.map(r=>'<li><button type="button" class="route" data-edit="'+esc(r.id)+'">'+routeBadge(r)+'<span class="route-text"><b>'+esc(r.name||'Sin nombre')+'</b><small>'+(r.points.length>1?r.stops.length+(r.stops.length===1?' parada':' paradas')+' · '+km(geo.length(r.points)):'<span class="warn">Sin trazo: no se publicará</span>')+'</small></span><span class="route-meta">'+esc(sourceLabel[r.source])+'</span></button></li>').join('');
 $('#empty').hidden=routes.length>0;$('#empty').innerHTML=icon('route')+'<p><b>Todavía no hay rutas.</b><br>Crea la primera con Nueva ruta.</p>';
}
$('#list').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openEditor(b.dataset.edit);});

function openEditor(id){
 current=routes.find(r=>r.id===id);if(!current)return;undoStack=[];
 for(const k of ['code','name','from','to','fare','hours','frequency','notes','source'])$('#f-'+k).value=current[k]||'';
 $('#f-via').value=current.via.join(', ');
 $('#list-view').hidden=true;$('#editor-view').hidden=false;$('#editor-view').scrollTop=0;
 setTool(current.points.length>1?'info':'trace');renderSwatches();drawOthers();
 if(current.points.length>1)fit(current.points);
 if(!current.name)$('#f-name').focus();
}
function closeEditor(){
 current=null;editLayer.clearLayers();$('#editor-view').hidden=true;$('#list-view').hidden=false;renderList();drawOthers();
}
$('#back').onclick=$('#done').onclick=closeEditor;
function setTool(next){
 tool=next;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
 for(const t of ['trace','stops','info'])$('#tool-'+t).hidden=t!==tool;
 $('#map').classList.toggle('picking',tool!=='info');
 renderTrace();renderStops();drawEditor();
}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function renderTrace(){
 const r=current;if(!r)return;
 $('#trace-stats').innerHTML='<div><b>'+r.waypoints.length+'</b><small>puntos</small></div><div><b>'+km(geo.length(r.points))+'</b><small>recorrido</small></div><div><b>'+r.stops.length+'</b><small>paradas</small></div>';
 $("#undo").disabled=!undoStack.length;$('#reverse').disabled=$('#clear-trace').disabled=!r.waypoints.length;
}
function renderStops(){
 const r=current;if(!r)return;
 $('#stop-list').style.setProperty('--c',r.color);
 $('#stop-list').innerHTML=r.stops.length?r.stops.map((s,i)=>'<li><input value="'+esc(s.name)+'" maxlength="60" data-stop="'+i+'" aria-label="Nombre de la parada '+(i+1)+'"><button type="button" class="icon-btn" data-remove-stop="'+i+'" aria-label="Quitar parada">'+icon('trash')+'</button></li>').join(''):'<li class="none">Sin paradas. Toca el mapa para agregar la primera.</li>';
}
$('#stop-list').addEventListener('input',e=>{const i=e.target.dataset.stop;if(i===undefined)return;current.stops[i].name=e.target.value.slice(0,60)||'Parada';save();});
$('#stop-list').addEventListener('change',()=>drawEditor());
$('#stop-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove-stop]');if(b)edit(r=>{r.stops.splice(Number(b.dataset.removeStop),1);});});
$('#undo').onclick=()=>{queue=queue.then(()=>{const prev=undoStack.pop();if(!prev||!current)return;const s=JSON.parse(prev);current.waypoints=s.w;current.legs=s.l;current.stops=s.s;rebuild(current);save();drawEditor();renderTrace();renderStops();});};
$('#reverse').onclick=()=>edit(r=>{r.waypoints.reverse();r.legs=r.legs.reverse().map(l=>l.slice().reverse());const f=r.from;r.from=r.to;r.to=f;$('#f-from').value=r.from;$('#f-to').value=r.to;});
$('#clear-trace').onclick=()=>edit(r=>{r.waypoints=[];r.legs=[];});

// Datos de la ruta: se guardan al escribir.
const fields=['code','name','from','to','fare','hours','frequency','notes','source'];
for(const k of fields)$('#f-'+k).addEventListener('input',()=>{current[k]=$('#f-'+k).value;save();if(k==='code')renderSwatches();});
$('#f-source').addEventListener('change',()=>{current.source=$('#f-source').value;save();});
$('#f-via').addEventListener('input',()=>{current.via=$('#f-via').value.split(',').map(v=>v.trim()).filter(Boolean);save();});
function renderSwatches(){
 const r=current;
 $('#swatches').innerHTML=PALETTE.map(c=>'<button type="button" role="radio" aria-checked="'+(r.color===c)+'" aria-label="Color '+c+'" data-color="'+c+'" style="--c:'+c+'"></button>').join('')+'<label title="Otro color"><input type="color" id="custom-color" value="'+r.color+'" aria-label="Otro color"></label>';
}
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(b)setColor(b.dataset.color);});
$('#swatches').addEventListener('input',e=>{if(e.target.id==='custom-color')setColor(e.target.value);});
function setColor(c){current.color=c;save();document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.color===c)));drawEditor();renderStops();}
$('#delete-route').onclick=e=>{
 const b=e.currentTarget;if(b.dataset.confirm!=='1'){b.dataset.confirm='1';b.innerHTML=icon('trash')+'¿Seguro? Toca otra vez';setTimeout(()=>{b.dataset.confirm='';b.innerHTML=icon('trash')+'Eliminar ruta';},4000);return;}
 routes=routes.filter(r=>r!==current);save();closeEditor();toast('Ruta eliminada. Publica para quitarla de la aplicación.');
};
$('#new-route').onclick=()=>{
 const used=new Set(routes.map(r=>r.color)),color=PALETTE.find(c=>!used.has(c))||PALETTE[routes.length%PALETTE.length];
 const r=prepare({id:'r-'+Date.now().toString(36),color});routes.push(r);save();renderList();openEditor(r.id);setTool('trace');
};

function payload(){
 const ready=routes.filter(r=>r.name.trim()&&r.points.length>1);
 return {ready,skipped:routes.length-ready.length,json:JSON.stringify({actualizado:new Date().toISOString(),rutas:ready.map(serialize)},null,1)};
}
function download(text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='rutas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#publish').onclick=async()=>{
 const {ready,skipped,json}=payload();
 if(!ready.length)return toast('No hay rutas con nombre y trazo para publicar.');
 $('#publish').disabled=true;
 try{
  const res=await fetch('rutas.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:json});
  if(!res.ok)throw Error(await res.text());
  dirty=false;try{localStorage.removeItem(DRAFT);}catch{}status();
  toast('Publicadas '+ready.length+(ready.length===1?' ruta':' rutas')+'.'+(skipped?' '+skipped+' sin nombre o sin trazo quedaron fuera.':''));
 }catch{
  download(json);$('#publish').disabled=false;
  toast('Este servidor no permite guardar. Se descargó rutas.json: cópialo a la carpeta rutas de la aplicación.');
 }
};
$('#export').onclick=()=>{download(payload().json);toast('Se descargó rutas.json.');};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try{const incoming=geo.validate(JSON.parse(await file.text())).map(prepare);const ids=new Set(incoming.map(r=>r.id));routes=[...routes.filter(r=>!ids.has(r.id)),...incoming];save();renderList();drawOthers();toast(incoming.length+(incoming.length===1?' ruta importada.':' rutas importadas.')+' Revisa y publica.');}
 catch(error){toast(error instanceof SyntaxError?'El archivo no es JSON válido.':error.message);}
};
addEventListener('beforeunload',e=>{if(dirty)e.preventDefault();});

(async()=>{
 let draft=null;try{draft=JSON.parse(localStorage.getItem(DRAFT));}catch{}
 if(Array.isArray(draft)){routes=draft.map(prepare);dirty=true;toast('Se recuperaron tus cambios sin publicar.');}
 else{try{routes=geo.validate(await (await fetch('rutas.json',{cache:'no-cache'})).json()).map(prepare);}catch{routes=[];}}
 routes.forEach(rebuild);status();renderList();drawOthers();
 const all=routes.flatMap(r=>r.points);if(all.length)fit(all);
 if(location.protocol==='file:')toast('Abre el panel desde node server.js (http://localhost:8090/admin.html) para poder publicar.');
})();
