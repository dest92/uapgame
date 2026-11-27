# Estado del POC por hito

## Hito 0 — Base
- Vite 8 + TypeScript 6 strict, Vitest, ESLint con reglas de capas, `specs/` con criterios numerados.

## Hito 1 — Datos + renderer
- Campus ubicado **por nombre** (Nominatim → `way/388521975`); descarga con respaldo: Overpass (3 servidores) → API OSM 0.6.
  En esta sesión Overpass no respondió y se usó la API oficial (queda registrado en `data/osm/meta.json`).
- **Terreno real del IGN** (MDT 30 m, 44–75 m s.n.m.) muestreado por WMS GetFeatureInfo (el WCS del IGN está deshabilitado), suavizado σ = 20 m.
- `world.json`: 44 edificios (38 con nombre), 170 caminos, 38 áreas, 92 POIs. 0 árboles en OSM.
- 19 carpetas de referencias fotográficas; 8 con datos utilizables → 7 edificios con apariencia por referencia
  (Biblioteca, FCS, Templo, Pabellón OGDEN, Salón de los Pioneros, Aulas Nuevas, Pórtico).
- Renderer `WebGPURenderer` con fallback WebGL2 (`?backend=webgl`).

## Hito 2 — Personaje, física, interacción
- Rapier: terreno + edificios + troncos/postes como colliders; character controller con autostep y snap.
- Personaje CC0 (Quaternius) vestido por shader + pelo fusionado; 6 estados de animación con cadencia según velocidad.
- Cámara orbital con colisión; teclado/mouse y joystick táctil.
- Hint a < 4 m de la entrada (calculada desde los caminos de OSM), panel con datos de `buildings-info.json` citando la fuente; minimapa.

## Hito 3 — Calidad visual
- Cielo físico con nubes, ciclo día/noche (slider), sol con CSM, luna, IBL del cielo, niebla.
- Post: GTAO, bloom, AgX, grading, viñeta.
- Fachadas procedurales con ventanas por piso (encendidas al azar de noche), techos de tejas/membrana, suelo mezclado por splat con texturas CC0, calles con cordón y línea central.
- Árboles procedurales (3 especies, 2 LOD, viento), pasto instanciado con viento, faroles, agua.

## Hito 4 — Rendimiento, mobile, calidad
- Presets bajo/medio/alto (resolución, sombras, AO, bloom, pasto, árboles) con persistencia y default por dispositivo.
- F3: fps, ms, draw calls, triángulos, backend, calidad.
- Carga inicial: ~9 MB sin comprimir, ~5 MB con gzip (`npm run check:size`).

## Hito 5 — Hero assets (edificios modelados)
- Pipeline por código (`npm run data:hero`): three.js en Node → GLB con texturas CC0 KTX2 y meshopt. Geometría real:
  vanos pasantes con derrames, carpinterías con parteluces/travesaños, arcos apuntados y óculos, placas con juntas,
  pilastras, cornisas, marquesinas, escalinatas con barandas, faldones de tejas, cintas de hormigón barridas y
  letras 3D extruidas (texto rasterizado con sharp → marching squares → extrusión).
- 7 edificios: Templo, Pórtico (arco + garita + mástil + plaza 2026) y edificio de ladrillo vecino (relation/16816367,
  con las letras "Universidad Adventista del Plata"), Biblioteca/Edificio Fernando Chaij, FCS, Pabellón OGDEN y
  Salón de los Pioneros. ~2.5 MB en total. Las fotos pegadas en fachadas ya no se usan.
- Los hero assets se apoyan a la cota del acceso principal (el Templo tiene 3 m de desnivel bajo su footprint);
  `refs.json` puede fijar la entrada (`summary.entrance`) cuando la estimada desde caminos cae en una fachada secundaria.
- Capturas: `docs/screenshots/hero-*.png` (WebGL2 por software).
- Supuestos a validar con el cliente: el polígono OSM "Pórtico" es el arco (lo cruza el camino de acceso) y el
  edificio de ladrillo es relation/16816367; el acceso de Pioneros (extremo NE) y el de la FCS (vértice entrante sur)
  se dedujeron de los senderos de OSM, no de una foto aérea. Interiores, techos no visibles en fotos y fachadas
  traseras son plausibles, no relevados.

## Pendiente / limitaciones conocidas
- **Verificación en GPU real**: en este entorno no hay GPU; las capturas son WebGL2 por software (SwiftShader).
  Falta medir fps reales en laptop con GPU integrada y en un celular de gama media, y validar el backend WebGPU.
- Rapier "compat" pesa ~4.2 MB (WASM en base64). Migrar a `@dimforge/rapier3d` con WASM separado ahorraría ~2.5 MB.
- Ventanas genéricas por grilla en los edificios sin hero asset (37 de 44).
- Los techos a dos aguas solo se generan en footprints casi rectangulares; el resto queda plano con parapeto.
- Árboles: OSM no tiene árboles mapeados en el campus; la ubicación es procedural (arbolado de vereda + relleno).
- El Sanatorio Adventista figura en OSM como punto (`node/3358913327`) sin edificio asociado dentro del área: su referencia no se aplica a ningún volumen.

## Datos y fotos que mejorarían el realismo
1. **Fotos propias** (`reference/photos/`) de los 11 edificios sin referencias: Lincoln Hall, Administración, Auditorio Mayor, PEF/Gimnasio, Edificio Humanidades, Aulas Humanidades, Hogares (Señoritas/Varones), CAE, Torre UAP, IAP.
   Ideal: una foto frontal + una a 45° por edificio, con algo de escala (personas, puertas).
2. **Cantidad de pisos y tipo de techo** de cada edificio (o cargarlos en OSM como `building:levels` y `roof:shape`).
3. **Ubicación de las puertas principales** (hoy se estiman desde los caminos).
4. **Árboles**: especies y ubicación de los ejemplares notables (o mapearlos en OSM como `natural=tree`).
5. **Planos** (`reference/plans/`) del campus para validar caminos internos y veredas.
6. **Textos institucionales verificados** para el panel (`data/buildings-info.json`, campo `description` con `source`).
7. **Hero assets**: faltan Auditorio Mayor, Administración, Lincoln Hall y Torre UAP (sin fotos de referencia).
