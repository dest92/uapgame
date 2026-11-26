# 012 — Referencias fotográficas

- **REF-1** Cada edificio tiene `reference/web/<osmKey>/refs.json` con URL de imagen, página de origen, autor, licencia, fecha y datos extraídos.
- **REF-2** Se rechazan URLs de Google Maps / Street View / Earth / fotos de fichas de Maps (`maps.google.*`, `google.*/maps`, `*.ggpht.com`, `streetviewpixels*`, `googleusercontent.com` de Maps, `earth.google.com`).
- **REF-3** Las imágenes de referencia **nunca** entran al build ni a `public/` (están en `.gitignore`).
- **REF-4** El `summary` (pisos, techo, colores, material) alimenta `build-world` (WLD-3/WLD-4) y los materiales (MAT-1).
- **REF-5** Edificios sin referencias quedan listados en `data/missing-info.md`.
