// Partes compartidas entre la vista pública (index.html) y el panel de administración (admin.html).
const CENTER=[20.0845,-98.3636];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km=m=>m<1000?Math.round(m)+' m':(m/1000).toFixed(1)+' km';
const sourceLabel={oficial:'Verificada',capturada:'Capturada',ejemplo:'Ejemplo'};
const icons={
 search:'<path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 install:'<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
 back:'<path d="M15 18 9 12l6-6"/>',
 pin:'<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
 locate:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
 route:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
 repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 swap:'<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
 save:'<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
 upload:'<path d="M12 21V9m-5 5 5-5 5 5M5 3h14"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16Z"/>',
 stop:'<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/>'
};
const icon=(name,cls='')=>'<svg class="i '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
let toastTimer;
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4500);}

// Diana prefiere la app en blanco: el tema queda fijo en claro.
const theme={apply(){document.documentElement.dataset.theme='light';}};
theme.apply();

// Mapa base vectorial de OpenFreeMap (estilo Positron, blanco; sin clave de API) o satélite de Esri con calles encima.
function createMap(id){
 const map=L.map(id,{zoomControl:false,attributionControl:true}).setView(CENTER,14);
 L.control.zoom({position:'topright',zoomInTitle:'Acercar',zoomOutTitle:'Alejar'}).addTo(map);
 map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
 let failed=false;
 const onError=()=>{if(!failed){failed=true;toast('No se pudo cargar el mapa de calles. Revisa tu conexión; las rutas siguen visibles.');}};
 const esri=(service,options={})=>L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/'+service+'/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,...options}).on('tileerror',onError);
 const osm='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
 let streets;
 try{
  if(!L.maplibreGL)throw Error('sin MapLibre');
  streets=L.maplibreGL({style:'https://tiles.openfreemap.org/styles/positron',attribution:'<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> '+osm});
  streets.on('add',()=>{const gl=streets.getMaplibreMap?.();gl?.on('error',onError);});
 }catch{
  // Sin WebGL: mapa gris claro de Esri en imágenes.
  streets=L.layerGroup([esri('Canvas/World_Light_Gray_Base',{maxNativeZoom:16,attribution:'Mapa &copy; Esri, '+osm}),esri('Canvas/World_Light_Gray_Reference',{maxNativeZoom:16})]);
 }
 const satellite=L.layerGroup([esri('World_Imagery',{attribution:'Imágenes &copy; Esri, Maxar, Earthstar Geographics'}),esri('Reference/World_Transportation',{opacity:.85})]);
 let current=streets.addTo(map),onSatellite=false;
 return {map,toggleSatellite(){onSatellite=!onSatellite;map.removeLayer(current);current=(onSatellite?satellite:streets).addTo(map);return onSatellite;}};
}
