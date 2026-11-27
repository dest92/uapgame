# 011 — Hero assets

- **HERO-1** Si existe `public/models/hero/<osmKey>.glb` (`osmKey` = `way-123`, `relation-456`), reemplaza al edificio procedural.
- **HERO-2** El GLB se posiciona en el centroide del footprint (su origen local = centroide, Y=0 = nivel del acceso principal). Se apoya a la cota del terreno en la entrada (`entrance`, que una referencia puede fijar con `summary.entrance`); el modelo incluye fundación por debajo de Y=0 para no flotar en pendiente.
- **HERO-3** El listado de hero assets se resuelve en build (`virtual:hero-assets`), sin requests a archivos inexistentes.
- **HERO-4** Soporta Draco, Meshopt y KTX2.
- **HERO-5** Los hero assets se generan por código (`npm run data:hero`, `tools/build-hero.ts`) a partir del footprint de OSM y las fotos de referencia: geometría real (vanos, carpinterías, cornisas, marquesinas, letras extruidas), materiales PBR con texturas CC0 KTX2 y meshopt. Al tener hero asset, el edificio deja de usar la foto pegada (`data/facade-photos.json`).
