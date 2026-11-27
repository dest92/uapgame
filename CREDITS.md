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

## Vegetación y mobiliario escaneados (Poly Haven, CC0 1.0 — https://polyhaven.com)
Optimizados por `tools/build-vegetation-models.ts` (follaje raleado por islas, ramas/tronco simplificados, KTX2 + meshopt).

| Modelo | Uso | Archivo |
|---|---|---|
| [Jacaranda Tree](https://polyhaven.com/a/jacaranda_tree) | Latifoliada principal (2 LODs) | `public/models/vegetation/jacaranda_tree_lod{0,1}.glb` |
| [Shrub 03](https://polyhaven.com/a/shrub_03), [Shrub 04](https://polyhaven.com/a/shrub_04) | Arbustos al pie de las fachadas | `public/models/vegetation/shrub_0{3,4}_lod0.glb` |
| [Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench) | Bancos en senderos | `public/models/vegetation/painted_wooden_bench_lod0.glb` |

## Texturas (ambientCG, CC0 1.0 — https://ambientcg.com)
Generadas por `tools/fetch-textures.ts` (KTX2/Basis ETC1S en `public/textures/`).

| Textura | Asset | Autor | Licencia | Uso |
|---|---|---|---|---|
| grass | [Grass004](https://ambientcg.com/view?id=Grass004) | ambientCG | CC0 1.0 | césped (terreno) |
| dirt | [Ground037](https://ambientcg.com/view?id=Ground037) | ambientCG | CC0 1.0 | tierra/grava (terreno, pista) |
| asphalt | [Asphalt010](https://ambientcg.com/view?id=Asphalt010) | ambientCG | CC0 1.0 | calles |
| paving | [PavingStones130](https://ambientcg.com/view?id=PavingStones130) | ambientCG | CC0 1.0 | veredas y senderos |
| concrete | [Concrete034](https://ambientcg.com/view?id=Concrete034) | ambientCG | CC0 1.0 | cordones, losas, techos planos |
| brick | [Bricks085](https://ambientcg.com/view?id=Bricks085) | ambientCG | CC0 1.0 | fachadas de ladrillo |
| plaster | [PaintedPlaster017](https://ambientcg.com/view?id=PaintedPlaster017) | ambientCG | CC0 1.0 | fachadas revocadas |
| rooftiles | [RoofingTiles006](https://ambientcg.com/view?id=RoofingTiles006) | ambientCG | CC0 1.0 | techos de tejas |
| bark | [Bark012](https://ambientcg.com/view?id=Bark012) | ambientCG | CC0 1.0 | troncos de árboles |
| metal | [Metal032](https://ambientcg.com/view?id=Metal032) | ambientCG | CC0 1.0 | faroles, techos metálicos |

## Fotos reales de fachada (decisión del cliente)
Por decisión de Ache Systems (equipo vinculado a la UAP) se usan como textura fotos de los **sitios institucionales de la UAP**.
Recomendado: confirmar por escrito el OK del área de comunicación de la UAP antes de publicar. Nunca se usan Google Maps/Street View/Earth.

| Edificio | Imagen original | Titular | Textura |
|---|---|---|---|
| `way/388500961` | https://amy.uap.edu.ar/wp-content/uploads/2018/07/templo_edit.jpg | Universidad Adventista del Plata (sitio institucional) | `public/textures/facades/way-388500961.webp` |
| `way/388510375` | https://uap.edu.ar/wp-content/uploads/2025/02/Escuela-de-Musica-UAP_edit.jpg | Universidad Adventista del Plata (sitio institucional) | `public/textures/facades/way-388510375.webp` |
| `way/388521996` | https://uap.edu.ar/wp-content/uploads/2026/08/portico-nuevo_edit.jpg | Universidad Adventista del Plata (sitio institucional) | `public/textures/facades/way-388521996.webp` |
| `way/388495172` | https://uap.edu.ar/wp-content/uploads/2025/07/slide03.jpg | Universidad Adventista del Plata (sitio institucional) | `public/textures/facades/way-388495172.webp` |
| `way/388495176` | https://uap.edu.ar/wp-content/uploads/2026/04/Medicina_EDIT_PORTADA.jpg | Universidad Adventista del Plata (sitio institucional) | `public/textures/facades/way-388495176.webp` |

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
