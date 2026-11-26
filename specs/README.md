# Specs (Spec Driven Development)

Cada funcionalidad nace como un spec con criterios de aceptación numerados (`GEO-1`, `WLD-3`, …).
Cada criterio tiene al menos un test que lo cita en su nombre (`it('WLD-3: …')`).

Flujo: **spec → test en rojo → implementación mínima → refactor → commit**.

| Spec | Área | Tests |
|---|---|---|
| [001](001-geo-projection.md) | Proyección geográfica ENU | `tests/shared/geo/*` |
| [002](002-osm-fetch.md) | Descarga OSM | `tests/tools/osm/*` |
| [003](003-world-build.md) | Generación de `world.json` | `tests/tools/world/*`, `tests/shared/world/*` |
| [004](004-renderer-backend.md) | Renderer WebGPU → WebGL2 | `tests/render/*` |
| [005](005-game-loop-state.md) | Loop, estado, eventos, input | `tests/core/*` |
| [006](006-player-camera.md) | Movimiento y cámara | `tests/domain/player/*`, `tests/domain/camera/*` |
| [007](007-interaction.md) | Interacción con edificios | `tests/domain/interaction/*`, `tests/tools/info/*` |
| [008](008-minimap.md) | Minimapa | `tests/domain/minimap/*` |
| [009](009-visuals.md) | Cielo, sol, vegetación, materiales | `tests/domain/sky/*`, `tests/domain/vegetation/*` |
| [010](010-quality.md) | Perfiles de calidad y rendimiento | `tests/domain/quality/*` |
| [011](011-hero-assets.md) | Hero assets | `tests/world/*` |
| [012](012-references.md) | Referencias fotográficas | `tests/tools/refs/*` |

Convención de ejes del mundo: **X = Este, Y = Arriba, Z = Sur** (el Norte es −Z). Unidades: metros.
