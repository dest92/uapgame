# Campus UAP — POC 3D (Ache Systems)

Recorrido jugable en tercera persona por el campus de la **Universidad Adventista del Plata** (Libertador San Martín, Entre Ríos), en el navegador.
Three.js (`WebGPURenderer` con fallback automático a WebGL2) + materiales TSL + Rapier + TypeScript estricto.

![Vista del campus](docs/screenshots/hito3-a.png)

## Correrlo

```bash
npm install          # copia también los decoders Draco/Basis a public/libs
npm run dev          # http://localhost:5173
npm run build && npm run preview
```

Parámetros de URL útiles: `?backend=webgl` (forzar WebGL2), `?quality=low|medium|high`, `?hour=18.5`, `?debug` (overlay F3 visible), `?tonemap=aces`.

**Controles** — WASD/flechas mover · Shift correr · Espacio saltar · mouse (click para capturar) mirar · rueda zoom · **E** interactuar · **M** ajustes · **F3** estadísticas · Esc cerrar panel.
En celulares: joystick a la izquierda, arrastrar a la derecha para mirar, botones Saltar / Correr / E.

## Calidad y tests

```bash
npm test             # Vitest: dominio, herramientas, geometría, física (Rapier real)
npm run typecheck    # tsc strict (app + tools)
npm run lint         # ESLint con reglas de capas (dominio sin Three/Rapier, etc.)
npm run e2e          # smoke E2E con Playwright + captura (requiere npm run build)
node tools/e2e/smoke.mjs --script tools/e2e/hito2.mjs   # recorrido: caminar → hint → panel
npm run check:size   # presupuesto de carga inicial (< 15 MB)
```

Se trabaja con **spec driven + TDD**: cada funcionalidad tiene su spec en [`specs/`](specs/README.md) con criterios numerados (`WLD-3`, `CAM-2`, …) y tests que los citan.

## Pipeline de datos (`/tools`)

| Comando | Qué hace |
|---|---|
| `npm run data:fetch-osm` | Ubica el campus **por nombre** (Nominatim) y descarga su perímetro + 100 m. Prueba Overpass y sus espejos y, si fallan, la API oficial de OSM 0.6 → `data/osm/` |
| `npm run data:fetch-terrain` | Muestrea la elevación del **IGN** (MDT 30 m) por WMS GetFeatureInfo → `reference/terrain/ign-mdt30-campus.tif` |
| `npm run data:build-world` | Proyecta a metros (ENU), aplica reglas de altura/techo/nombre, entradas, recorte y terreno suavizado → `data/world.json` + `data/missing-info.md` |
| `npm run data:build-info` | Genera `data/buildings-info.json` citando el origen de cada dato y **preservando ediciones manuales** |
| `npm run data:collect-refs` | Audita las referencias fotográficas (fuentes prohibidas, campos, que no lleguen al build) |
| `npm run data:textures` | Descarga texturas CC0 de ambientCG y las codifica a KTX2 → `public/textures/` |
| `npm run assets:fetch && npm run data:character` | Personaje CC0 (Quaternius) + animaciones → GLB con KTX2 + meshopt |
| `npm run data` | fetch-osm → fetch-terrain → build-world → collect-refs |

Nunca se usan datos de Google Maps/Earth/Street View ni sus fotos. Las fotos de `reference/web/` son **solo referencia visual** y no se versionan.

## Agregar un hero asset (modelo detallado de un edificio)

1. Buscá el id OSM del edificio en `data/world.json` (p.ej. `way/388495172`, Biblioteca).
2. Exportá el modelo en **glTF binario** con:
   - origen local en el **centroide del footprint**, a nivel del suelo (Y = 0 en la base), +Y arriba, metros;
   - frente orientado igual que en el mundo (X = Este, −Z = Norte);
   - compresión opcional: Draco o Meshopt para geometría y KTX2 para texturas (`gltf-transform optimize`).
3. Guardalo como `public/models/hero/way-388495172.glb` (la `/` del id pasa a `-`).
4. Recargá: el edificio procedural se omite, el GLB se ubica sobre el terreno y conserva su colisión e interacción.

## Arquitectura

```
shared/      Lógica pura compartida por tools y juego: proyección ENU, polígonos, reglas de mundo, esquema world.json
src/core     Loop (paso fijo + interpolación), EventBus tipado, GameState serializable (listo para Colyseus), input abstracto
src/domain   Reglas puras: movimiento, cámara orbital, interacción, posición solar, vegetación, calidad, minimapa
src/physics  Puerto PhysicsWorld + adaptador Rapier (character controller, rayos de cámara)
src/world    Generación procedural: terreno, suelo (splat), calles con cordón, edificios, agua, vegetación, hero assets
src/render   Renderer + fallback, cielo/sol/IBL, post-procesado, materiales PBR/TSL, texturas KTX2
src/player   Controlador del jugador, vista animada (ropa por shader), cámara con colisión
src/gameplay Sistemas de juego (interacción)
src/ui       HUD en HTML/CSS: carga, hint, panel, minimapa, ajustes, joystick, debug
src/app      Raíz de composición (inyección de dependencias), calidad
```

Reglas de dependencia verificadas por ESLint: `shared/`, `domain/` y `core/` no importan Three ni Rapier; la UI no conoce render/física; la física no conoce el render. El mundo pide materiales a través de puertos (`MaterialProvider`, `VegetationMaterials`) que implementa la capa de render.

## Datos y créditos

Ver [CREDITS.md](CREDITS.md). Atribución ODbL visible en la UI: "© OpenStreetMap contributors".
