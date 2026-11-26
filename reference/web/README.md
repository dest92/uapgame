# Referencias fotográficas web (campus UAP)

Fecha de recolección: 2026-11-26.

Fotos de referencia **solo para estimar** proporciones, cantidad de pisos, forma de techo, colores, materiales y ubicación de puertas y ventanas de los edificios que el juego genera de forma procedural. No se redistribuyen: los archivos de imagen (`*.jpg`) están excluidos de git por `reference/web/.gitignore`. Solo se versionan `refs.json`, `_summary.json` y este README.

## Estructura

- `reference/web/<folder>/refs.json`: una carpeta por edificio. El nombre de la carpeta es el id de OSM (`way-…`, `node-…`, `relation-…`), más `campus-general`.
- `NN.jpg`: imágenes reescaladas a 1600 px como máximo.
- `_summary.json`: resumen por edificio (`levels`, `roof`, colores, `confidence`, `refCount`).
- Los campos `extracted` y `notes` solo registran lo que se ve en la imagen o se lee en la fuente. Los colores hex son aproximados y los niveles son estimaciones visuales.

## Proceso y consultas

1. **Wikimedia Commons API.** Búsqueda (`list=search`, namespace 6) con "Universidad Adventista del Plata", "Libertador San Martín Entre Ríos", "Puiggari", "Sanatorio Adventista", "Instituto Adventista del Plata", "Adventist University of the Plata" y "LSM Entre Rios". También se listó `Category:Universidad Adventista del Plata` y se pidió `imageinfo` + `extmetadata` para autor y licencia. Commons empezó a responder HTTP 429 (límite de solicitudes), así que no se completaron la geobúsqueda ni algunas descargas: `Bibliotecha.jpg` y `Rio de la Plata Academy 1909 2.JPG`.
2. **WebSearch.** Se buscó "Universidad Adventista del Plata edificios campus Libertador San Martín", "Biblioteca Mohr UAP", "Templo UAP Libertador San Martín", "Sanatorio Adventista del Plata edificio fachada", "Instituto Adventista del Plata IAP edificio", "Hogar de Señoritas / Hogar de Varones UAP", "flickr Universidad Adventista del Plata", entre otras. Aportaron sobre todo texto, como que la biblioteca funciona en el edificio Fernando Chaij, y pocas imágenes.
3. **Sitios oficiales (WordPress REST API).**
   - `uap.edu.ar/wp-json/wp/v2/media?search=…` y `/posts?search=…`, con términos de edificios: templo, biblioteca, fachada, pórtico, música, teología, aérea, gimnasio, hogar, etc.
   - El archivo de medios más antiguo, compartido por `amy.uap.edu.ar` y `biblioteca.uap.edu.ar`, con los mismos términos.
   - Las páginas de `uap.edu.ar`, entre ellas `desarrollo-edilicio/direccion-proyectos-edilicios/`, de donde salen las fotos con dron.
   - El certificado de `uap.edu.ar` no trae el intermedio Sectigo "Public Server Authentication CA DV R36". Se obtuvo de crt.sh y se agregó a una copia local del bundle de CA. No se desactivó la verificación TLS.
4. **Sanatorio.** Se usaron las imágenes del sitio oficial `www.sanatorioadventista.org.ar` (Webflow, páginas de inicio e institucional).
5. **Revisión.** Cada imagen se revisó visualmente antes de asignarla. Si no se podía confirmar el edificio, la imagen fue a `campus-general` o se descartó: interiores de eventos, retratos, una nave interior rotulada "Auditorio" que no se pudo identificar, el Museo del Conquistador y otras.

## Reglas de descarte aplicadas

- Nada de Google Maps, Street View, Google Earth ni fotos subidas a fichas de Maps. Ninguna URL usada pertenece a `maps.google.*`, `google.*/maps`, `*.googleusercontent.com`, `*.ggpht.com`, `streetviewpixels*` ni `earth.google.com`, y ninguna imagen muestra interfaz de Maps.
- Se descartaron imágenes cuyo edificio no se podía confirmar, gráficas sin el edificio, interiores sin valor para el modelado exterior e imágenes de otros campus. Las gráficas institucionales con superposición se conservaron solo como referencia de forma, y así lo indica su `refs.json`.
- No se usaron proyectos de concurso ni renders, por ejemplo el de Architizer para el Sanatorio.

## Fuentes

- Wikimedia Commons (licencias abajo).
- `uap.edu.ar`, `amy.uap.edu.ar` y `biblioteca.uap.edu.ar`: © Universidad Adventista del Plata, uso exclusivo como referencia.
- `www.sanatorioadventista.org.ar` (cdn.prod.website-files.com): © Sanatorio Adventista del Plata, uso exclusivo como referencia.

## Usables como textura

Estas imágenes de Wikimedia Commons tienen licencia libre. Usarlas o derivarlas requiere atribución, y con CC BY-SA la obra derivada debe compartirse con la misma licencia.

| Archivo local | Commons | Autor | Licencia |
|---|---|---|---|
| `way-388521996/01.jpg` | [File:ENTRANCE UAP.jpg](https://commons.wikimedia.org/wiki/File:ENTRANCE_UAP.jpg) | Themidget17 | CC BY-SA 4.0 |
| `way-388512621/01.jpg` | [File:Iglesia de los Pioneros.jpg](https://commons.wikimedia.org/wiki/File:Iglesia_de_los_Pioneros.jpg) | Themidget17 | CC BY-SA 4.0 |
| `node-3358913327/06.jpg` | [File:Iglesia del Sanatorio Adventista del Plata.jpg](https://commons.wikimedia.org/wiki/File:Iglesia_del_Sanatorio_Adventista_del_Plata.jpg) | Gonzalo Blasco | CC BY-SA 3.0 |

Las imágenes restantes no tienen licencia libre: sirven solo como referencia visual y no se usan como textura.

## Edificios sin referencias

Lincoln Hall, Administración (Rectoría), Auditorio Mayor, PEF / Gimnasio, Edificio Humanidades, Aulas Humanidades, Hogar de Señoritas Nuevo, Hogar de Varones NUEVO, CAE, Torre UAP e IAP. Cada uno tiene `refs.json` con `refs: []`. Pendiente: reintentar la geobúsqueda de Commons (`list=geosearch` cerca de -32.0734, -60.4670) cuando se levante el límite de solicitudes.
