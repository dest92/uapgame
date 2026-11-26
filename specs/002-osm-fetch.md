# 002 — Descarga de OpenStreetMap (`tools/fetch-osm.ts`)

**Historia:** como desarrollador quiero descargar los datos del campus de OSM de forma reproducible, sin coordenadas hardcodeadas.

- **OSM-1** El campus se ubica buscando por nombre ("Universidad Adventista del Plata", `amenity=university`). Se usa la geometría de esa entidad como perímetro.
- **OSM-2** El área de descarga es el bbox del perímetro expandido 100 m por lado.
- **OSM-3** Se consultan fuentes en orden (Overpass principal → espejos → API oficial OSM 0.6). Si una falla o expira, se pasa a la siguiente; si todas fallan, error con el detalle de cada intento.
- **OSM-4** La consulta Overpass pide edificios, caminos, áreas verdes/landuse/leisure, `natural=tree`, `amenity`/`office`/`shop`/`tourism` POIs.
- **OSM-5** La salida es `data/osm/campus.geojson` (GeoJSON crudo) + `data/osm/meta.json` (fuente usada, fecha, bbox, id del campus, atribución ODbL).
- **OSM-6** Nunca se usan servicios de Google.
