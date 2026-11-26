# 009 — Calidad visual

- **SKY-1** Posición solar calculada desde la hora del día (0–24) y la latitud del campus (−32.07°): al mediodía elevación alta, a las 0 h bajo el horizonte.
- **SKY-2** Slider de hora en el menú de debug; la luz del sol, el cielo, el ambiente y la niebla se actualizan.
- **SKY-3** De noche la intensidad del sol cae a 0 y se usa luz de luna tenue; se encienden farolas (emisivo + bloom).
- **VEG-1** Muestreo Poisson-disk determinista (seed) dentro de polígonos verdes, excluyendo edificios, caminos y canchas.
- **VEG-2** Los árboles de OSM se respetan en su posición; el relleno procedural mantiene ≥ 4 m de separación.
- **VEG-3** 2–3 especies, elegidas de forma determinista por posición.
- **VEG-4** Pasto instanciado con viento en shader (TSL), densidad según calidad.
- **MAT-1** Materiales PBR por edificio derivados de las referencias (color de pared/techo/material); sin referencias → genéricos y anotado en `missing-info.md`.
- **ROAD-1** Calles con calzada + cordón + vereda (geometría con bordes), senderos con borde levemente elevado.
