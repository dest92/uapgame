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
- **VEG-5** Arbolado de vereda: a ambos lados de las calles cada 13 m, a ancho/2 + 2.2 m, descartando puntos dentro de edificios/canchas/agua. (Decisión: OSM no tiene `natural=tree` en el campus; las calles de Libertador San Martín son arboladas según las referencias generales.)
- **LAMP-1** Faroles cada ~32 m a un costado de las calles; cabezal emisivo controlado por `night` (bloom).
- **WATER-1** Áreas `water` (piletas, fuentes) como superficies planas reflectivas.
- **FAC-1** Gramática de fachada (`shared/world/facadeGrammar.ts`): pisos de 3,2 m y bahías de 3,3 m centradas; ninguna ventana se sale de la pared ni invade el margen superior (0,7 m); paredes < 2,6 m sin ventanas.
- **FAC-2** A menos de ~60 m (LOD por celda de 72 m): ventanas con retiro real de 18 cm, marco, parante, travesaño, vidrio (reflejo + interior falso + luz nocturna), alféizar saliente y dintel. Un vidrio por vano.
- **FAC-3** Muro cercano = rectángulos macizos alrededor de los vanos (cubren exactamente la pared menos los vanos); normales hacia afuera.
- **FAC-4** Puerta en la pared más cercana a `entrance`, alineada a la bahía, con umbral a la cota del terreno de la entrada y marquesina. Siempre visibles: zócalo, coronamiento de parapeto o friso bajo alero, pilastras en esquinas convexas. Lejos, `facadeNode` pinta la misma grilla (constantes compartidas) con chorreaduras bajo alféizares y suciedad de salpicado.
- **MAT-2** Techos: chapa acanalada procedural (onda 7,6 cm con relieve por derivadas, juntas, óxido, chorreaduras), tejas orientadas con la pendiente, membrana con manchas de agua. Ladrillo procedural por pieza (junta de 1 cm, color y piezas quemadas por hash).

## Decisiones técnicas
- AO: GTAO a media resolución multiplicando el color final (una sola pasada de geometría con MRT), en vez de `builtinAOContext` (que requiere pre-pasada).
- Bloom con umbral alto (2.2 en HDR) para que solo florezcan el sol, faroles y ventanas encendidas.
- IBL: PMREM del cielo, regenerado solo cuando la hora cambia > 0.2 h.
- Texturas de follaje generadas en canvas en runtime (0 bytes de descarga).
