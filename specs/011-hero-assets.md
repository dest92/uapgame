# 011 — Hero assets

- **HERO-1** Si existe `public/models/hero/<osmKey>.glb` (`osmKey` = `way-123`, `relation-456`), reemplaza al edificio procedural.
- **HERO-2** El GLB se posiciona en el centroide del footprint (su origen local = centroide, Y=0 en la base) y se apoya sobre el terreno.
- **HERO-3** El listado de hero assets se resuelve en build (`virtual:hero-assets`), sin requests a archivos inexistentes.
- **HERO-4** Soporta Draco, Meshopt y KTX2.
