# 010 — Calidad y rendimiento

- **QLT-1** Presets `low` / `medium` / `high` ajustan: resolución de render (pixelRatio), sombras (tamaño de mapa, cascadas), AO, bloom, densidad de pasto, distancia de vegetación.
- **QLT-2** Preset por defecto según dispositivo: móvil/táctil → `low`, otro → `medium` (`high` manual).
- **QLT-3** El preset se guarda en `localStorage` (tolerante a fallos).
- **PERF-1** Overlay F3: fps, ms/frame, draw calls, triángulos, backend.
- **PERF-2** Carga inicial < 15 MB (verificado en build: script `tools/check-bundle-size.ts`).
- **PERF-3** Pantalla de carga con progreso real por etapas.

## Estado
- PERF-2 verificado por `npm run check:size`: ~9 MB sin comprimir / ~5 MB con gzip (Rapier compat ≈ 4.2 MB es el mayor ítem; ver pendientes).
- Parámetros de URL: `?quality=`, `?backend=webgl`, `?hour=`, `?debug`.
