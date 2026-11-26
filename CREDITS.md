# Créditos y licencias

## Datos
| Recurso | Fuente | Licencia | Uso |
|---|---|---|---|
| Edificios, caminos, áreas, POIs | © OpenStreetMap contributors — https://www.openstreetmap.org/copyright | ODbL 1.0 | `data/osm/`, `data/world.json`, `data/buildings-info.json` (atribución visible en la UI) |
| Geocodificación del campus | Nominatim (OpenStreetMap) | ODbL 1.0 | `tools/fetch-osm.ts` |
| Elevación | Instituto Geográfico Nacional de la República Argentina — capa `mosaico_alos_30:mdt_argentina_alos_30m` (WMS) | Datos abiertos IGN (citar fuente) | `reference/terrain/ign-mdt30-campus.tif` → terreno |

## Modelos 3D
| Recurso | Autor | Licencia | Archivo |
|---|---|---|---|
| Universal Base Characters (Superhero_Male_FullBody) | Quaternius — https://quaternius.com | CC0 1.0 | `public/models/character/student.glb` (ropa pintada por shader) |
| Universal Animation Library (8 clips) | Quaternius — https://quaternius.com | CC0 1.0 | `public/models/character/animations.glb` |

## Texturas
(Se completa en el Hito 3 con las texturas CC0 de ambientCG / Poly Haven.)

## Referencias fotográficas
Las fotos de `reference/web/` se usan **solo como referencia visual** (proporciones, pisos, techos, colores) y
**no** se distribuyen (están en `.gitignore`). Ver `reference/web/README.md` y cada `refs.json` para autor, URL y licencia.
Imágenes de Wikimedia Commons utilizables como textura (CC BY-SA, requieren atribución si se usan):
- *ENTRANCE UAP.jpg* — Themidget17 — CC BY-SA 4.0
- *Iglesia de los Pioneros.jpg* — Themidget17 — CC BY-SA 4.0
- *Iglesia del Sanatorio Adventista del Plata.jpg* — Gonzalo Blasco — CC BY-SA 3.0

(Actualmente no se usan como textura.)

## Software
three.js (MIT), Rapier (Apache-2.0), Vite (MIT), glTF Transform (MIT), ktx2-encoder (Apache-2.0), osmtogeojson (MIT), geotiff.js (MIT).
