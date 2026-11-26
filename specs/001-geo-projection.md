# 001 — Proyección geográfica local (ENU)

**Historia:** como pipeline de datos necesito convertir lat/lon de OSM a metros locales centrados en el campus, para construir geometría en el motor.

- **GEO-1** Dado un origen (lon0, lat0), el origen proyecta a (0, 0).
- **GEO-2** Un punto 0.001° al norte del origen proyecta con z ≈ −110.9 m (±0.5 m, elipsoide WGS84 a −32°) y x ≈ 0.
- **GEO-3** Un punto 0.001° al este a latitud −32° proyecta con x ≈ 94.3 m (±0.5 m).
- **GEO-4** `toGeo(toLocal(p)) ≈ p` con error < 1e-7° en un radio de 2 km.
- **GEO-5** Utilidades de polígonos: área con signo, orientación CCW, centroide, punto-en-polígono, distancia punto-segmento, bbox y expansión de bbox en metros.
