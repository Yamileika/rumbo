# Rumbo · Colectivas de Tulancingo

PWA en español para ver por dónde pasan las rutas de colectivas de Tulancingo de Bravo, Hgo. Reemplaza a Yomi (manga).

## Abrir

Con Node.js instalado:

```powershell
node C:\PWA\rutas\server.js
```

- Rumbo: http://localhost:8090/
- Administración de rutas: http://localhost:8090/admin.html
- Columna: http://localhost:8091/
- Temperatura: http://localhost:8092/

Cada aplicación usa su propio puerto para que Windows las instale como aplicaciones separadas, cada una con su widget. Usa Instalar en Edge o Chrome.

## Aplicación (index.html)

Mapa a pantalla completa con un panel flotante (hoja inferior en el celular):

- **Rutas:** lista con la clave, el nombre y de dónde a dónde va. El buscador encuentra por clave, colonia, calle o parada.
- **Detalle:** la ruta resaltada en el mapa con su salida (A), su llegada (B) y sus paradas; tarifa, horario, frecuencia y la línea de paradas.
- **Cerca de mí:** toca el mapa o usa tu ubicación y ve qué rutas pasan a 200, 400 u 800 m.
- **Guardadas:** la estrella guarda rutas en este dispositivo.
- Compartir la ruta como texto o como imagen PNG, vista satélite y widget de escritorio (en Acerca de).

## Panel de administración (admin.html)

1. **Nueva ruta:** escribe la clave y el nombre y elige el color.
2. **Trazo:** toca el mapa en el orden del recorrido. Con "Seguir las calles" activado, cada tramo se calcula por las calles (servicio público OSRM, necesita internet). Arrastra un punto para moverlo, tócalo para quitarlo y toca la línea para agregar un punto en medio. También hay Deshacer, Invertir sentido y Borrar trazo.
3. **Paradas:** toca el mapa para agregar paradas y ponles nombre; se ordenan solas según el recorrido.
4. **Datos:** sale de, llega a, calles por donde pasa, tarifa, frecuencia, horario, notas y estado (capturada, verificada o ejemplo).
5. **Publicar:** escribe `rutas.json` directamente (guarda el anterior como `rutas.respaldo.json`). La aplicación lo muestra al recargar.

Los cambios se guardan como borrador en el navegador mientras no publiques. Si el panel no está abierto desde `server.js`, Publicar descarga `rutas.json` para copiarlo a esta carpeta. El servidor solo acepta publicar desde http://localhost:8090.

El trazo por calles usa el perfil de automóvil de OSRM, que respeta los sentidos de circulación; revisa los tramos donde la colectiva tome calles que el mapa no tenga.

## Datos

No hay un listado público oficial de recorridos (la Dirección de Movilidad municipal estima al menos 22 rutas; Criterio Hidalgo, 11/11/2024). `rutas.json` trae tres rutas de EJEMPLO (punteadas): edítalas o elimínalas desde el panel.

## Mapas

Mapa blanco vectorial de OpenFreeMap (estilo Positron, sin clave de API, con MapLibre GL en vendor/maplibre) y satélite de Esri. Se descartaron los servidores de OpenStreetMap (bloqueo por política de uso) y de CARTO (piden clave de API). Sin internet se ven las rutas pero no las calles.

Pruebas: `node geo.test.js`
