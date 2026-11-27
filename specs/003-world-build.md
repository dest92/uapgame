# 003 — Generación de `data/world.json` (`tools/build-world.ts`)

**Historia:** como juego necesito un modelo del mundo en metros locales, liviano y validado.

- **WLD-1** Se proyecta todo a ENU con origen en el centroide del campus.
- **WLD-2** Edificio: footprint CCW sin punto repetido de cierre, con huecos si es multipolígono (se toma el anillo exterior).
- **WLD-3** Altura: `height` (m) si existe; si no `building:levels × 3.2`; si no default por tipo (`house` 1 nivel, `industrial` 2 niveles de 4.5 m, `church` 9 m, `dormitory` 3 niveles, otros 2 niveles); `roof:height` se suma si el techo no es plano. Referencias fotográficas (`summary.levels`) tienen prioridad sobre los defaults pero no sobre tags explícitos.
- **WLD-4** Techo: `roof:shape` si existe (`flat`, `gabled`, `hipped`, `pyramidal`, `dome`); si no, el de las referencias; si no, `house`/`church` → `gabled`, resto `flat`.
- **WLD-5** Nombre: `name` si existe; si no "Edificio sin identificar (OSM <tipo> <id>)" y se registra en `data/missing-info.md`. Si un POI con nombre está dentro del footprint, se asocia como `pois` del edificio (no se inventan nombres).
- **WLD-6** Caminos: polilíneas con ancho por tipo (`primary` 9 m, `secondary` 7.5 m, `residential` 6 m, `service` 4 m, `footway/path/pedestrian` 2–3 m, `steps` 2 m) y superficie normalizada (`asphalt`, `paved`, `concrete`, `gravel`, `unpaved`, `grass`).
- **WLD-7** Áreas: `park`, `garden`, `grass`, `pitch`, `parking`, `swimming_pool`, `track`, `religious`… como polígonos con `kind`.
- **WLD-8** Árboles: nodos `natural=tree` como puntos (especie si hay `leaf_type`/`species`).
- **WLD-9** Entrada de edificio: punto en el borde del footprint más cercano a un camino peatonal (o calle), desplazado 0.5 m hacia afuera; si no hay caminos, el punto medio de la arista más larga.
- **WLD-10** Todo se recorta al bbox de trabajo (campus + 100 m); se descartan geometrías degeneradas (< 3 vértices, área < 4 m²).
- **WLD-11** `validateWorld()` valida la forma de `world.json` en runtime y rechaza datos corruptos con un mensaje claro.
- **ROOF-1** Straight skeleton propio (`shared/geo/straightSkeleton.ts`) para polígonos simples: las caras teselan el footprint y cada nodo está a distancia `t` de la línea de su arista (caras planas). Funciona en todos los footprints reales.
- **ROOF-2** Techos inclinados offline (`shared/world/roofGeometry.ts`): 4 aguas = skeleton; 2 aguas = las caras triangulares de los extremos se vuelven hastiales (el vértice se desliza por la cumbrera, así los faldones siguen planos); pirámide al centroide; alero con inglete y cenefa. Pendiente por material (tejas 30°, chapa 12°) limitada por una altura máxima.
- **ROOF-3** Bóveda de cañón (`round`) sobre el rectángulo orientado si la rectangularidad ≥ 0,85; si no, 2 aguas.
- **ROOF-4** Forma/material/color del techo: tag OSM `roof:shape` > ortofoto IGN (`reference/aerial/roofs.json`, interpretación visual con confianza) > referencias > default. `world.json` guarda `roof.mesh` (faldones, hastiales, cenefa); el runtime solo triangula.
