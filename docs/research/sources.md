# Fuentes de referencia: campus UAP (Libertador San Martín, Entre Ríos)

Recolección: 2026-11-26 (primera pasada) y 2026-11-27 (esta pasada). Campus: OSM `way/388521975`, aprox. -32.0734, -60.4672. Bbox en `data/osm/meta.json`.

**Regla dura:** no se usó nada de Google Maps, Google Earth, Street View ni fotos `googleusercontent`/`ggpht`. Las imágenes de terceros se usan solo como referencia de modelado y no se redistribuyen: `reference/web/**/*.jpg` está en `.gitignore`.

## 1. Tabla de fuentes

Utilidad: 1 = marginal, 5 = imprescindible.

| Tipo | Fuente / URL | Licencia / términos | Fecha | Qué cubre | Útil |
|---|---|---|---|---|---|
| Ortofoto | IGN Argentina WMS `https://imagenes.ign.gob.ar/geoserver/ows`, capa `ortomosaicos_fotogrametria:rio_parana_3.5` ("Río Parana_2013_3.5") | Datos abiertos IGN; citar "Instituto Geográfico Nacional" | 2013 | Todo el bbox del campus a 0.25 m/px (GSD nativo ~0.4-0.5 m). Archivo `reference/aerial/ign-rio-parana-2013-campus-0.25m.jpg` + `.json`; overview y overlay OSM | 5 |
| Ortofoto | IGN `mosaicos_vuelos` | igual | 2013 | Devuelve el mismo mosaico en esta zona | 2 |
| Ortofoto | IGN `mosaicos_vuelos_vant` | igual | — | Vacía (transparente) sobre LSM | 0 |
| DEM | IGN `mosaico_mde_vant_50cm`, `mde_5m_vuelos:mde_5m_rio_parana_3.5_2013` | igual | 2013 | Existen sobre el área; no descargados aquí (ya hay MDT30 en `reference/terrain/`). El MDE 5 m 2013 es candidato para mejorar el terreno | 3 |
| Ortofoto | IDE Entre Ríos `https://geoservicios.entrerios.gov.ar/geoserver/ows` | — | 2026 | 69 capas vectoriales (red vial, hidrografía, radios censales), **sin ortofotos** | 1 |
| Ortofoto | OpenAerialMap `api.openaerialmap.org/meta?bbox=-60.48,-32.08,-60.45,-32.06` | CC BY 4.0 | — | **0 resultados** | 0 |
| Satélite | Esri World Imagery / Bing | Términos propietarios: solo visualización, no descargado | — | Imagen más reciente para verificar obras posteriores a 2013 (ver con el visor, no copiar) | 3 |
| Street-level | Mapillary `graph.mapillary.com` | Requiere token OAuth (error 190 sin token) | — | **Bloqueado**: hace falta un token propio para listar imágenes | ? |
| Street-level | KartaView `api.kartaview.org/2.0/photo/?lat=…&radius=500` (5 puntos) | CC BY-SA | — | **0 fotos** en un radio de 500 m del campus | 0 |
| Fotos oficiales | `uap.edu.ar` (WP media + páginas + posts), ~1550 medios 2024-2026 | © UAP, solo referencia | 2024-2026 | Pórtico, Templo, Biblioteca, Salón de los Pioneros, Ogden (hall 2026), drones 2026, obra Fayard | 5 |
| Fotos oficiales | `amy.uap.edu.ar` (WP antiguo, ~2900 medios) | © UAP | 2013-2020 | Templo exterior/interior, Biblioteca, Pórtico, Auditorio Mayor interior, FCS/Odontología en obra, IAP aulas, Ogden frontal | 5 |
| Página | `https://uap.edu.ar/desarrollo-edilicio/direccion-proyectos-edilicios/` | © UAP | 2026 | Fotos de dron DJI 2026-04 y replanteo del edificio Fayard | 4 |
| Noticia | `https://uap.edu.ar/la-uap-inauguro-el-hall-de-ingreso-para-su-escuela-de-musica-y-proyecta-nuevas-mejoras-edilicias/` | © UAP | 2026-06 | Ogden: obra 1906-1908, 45 000 ladrillos, nuevo hall, reemplazo de aberturas previsto | 4 |
| Noticia + plano | `https://uap.edu.ar/ceremonia-de-inicio-de-obras-del-centro-de-formacion-en-salud-emocional-y-fe-esther-i-de-fayard/` | © UAP | 2026-04 | Edificio nuevo "Esther I. de Fayard", 290 m2, detrás del CUAI (Marshall 55); planta + renders: `reference/plans/web/fayard-…jpg` | 4 |
| Cronología | `https://amy.uap.edu.ar/2017/11/algunos-hitos-en-la-historia-de-la-uap/` | © UAP | 2017 | Fechas de los edificios (ver §5) | 4 |
| Informe | CONEAU `advplata.pdf` (1999) y `70_Adventista_delPlata.pdf` (2017), en `reference/plans/web/` | Documento público | 1999 / 2017 | m2 cubiertos, número de edificios, Biblioteca de 2.500 m2 en 3 plantas, gimnasio de 3.766 m2, Templo para 2.500 personas, antena FM de 60 m | 3 |
| Noticia TV | Elonce `https://www.elonce.com/uid-775845` ("…la madre de Libertador San Martín") | © Elonce (marca de agua) | 2023-10 | Fachada del Salón de los Pioneros, detalle de Ogden, Torre, memorial | 4 |
| Instagram | Feed de @uapargentina embebido en `uap.edu.ar` (fbcdn) | © UAP | 2026-11 | 1 foto de dron útil (Pórtico/Ex CAP y calle). El perfil directo exige login | 3 |
| Wikimedia Commons | geosearch 1.5 km (6 archivos). Usado: `File:CENTRO - panoramio (1).jpg` | CC BY-SA 3.0 | 2007 | Calle 25 de Mayo céntrica | 2 |
| Wikimedia Commons | Primera pasada: ENTRANCE UAP, Iglesia de los Pioneros, Iglesia del Sanatorio | CC BY-SA 3.0 / 4.0 | 2015 | Ver `reference/web/README.md` | 4 |
| YouTube | Miniaturas `i.ytimg.com/vi/<id>/maxresdefault.jpg` y fotogramas automáticos `hq1/2/3.jpg` (≈25/50/75 %) | © de cada canal; solo miniaturas, sin descargar video | 2015-2026 | Ver §2 | 4 |
| Planos de campus | Búsquedas "plano/mapa campus UAP", WP media PDF, manual de admisión 2026 | — | — | **No se encontró ningún plano o masterplan publicado del campus** | 0 |
| Noticia | adventist.news (inauguración de anexos del Centro Odontológico) | — | — | Bloqueado por un checkpoint de seguridad de Vercel | 0 |

## 2. Videos (drones y recorridos)

Los timestamps son **aproximados**: salen de los fotogramas automáticos de YouTube (`hq1/hq2/hq3` ≈ 25/50/75 % de la duración). Las páginas `watch` devolvieron una verificación anti-bot, así que no se pudieron leer storyboards ni capítulos. Conviene verificarlos reproduciendo el video.

| Video | Canal | Dur. | Vistas útiles |
|---|---|---|---|
| [OdDSF8aPi0s](https://www.youtube.com/watch?v=OdDSF8aPi0s) Universidad Adventista del Plata - Campus 2015 | UAP | 1:41 | **Dron.** ~0:25 Pórtico de cerca. ~0:50 Pórtico y edificio Ex CAP. ~1:16 Templo en aérea oblicua. Miniatura: aérea del campus |
| [iUWonJdCGms](https://www.youtube.com/watch?v=iUWonJdCGms) Recorrido de la Facultad de Teología | proyecto.preparar | 3:42 | Miniatura: aérea del Templo y su plaza. ~1:50 acceso vidriado del Templo |
| [x3584-4bk5E](https://www.youtube.com/watch?v=x3584-4bk5E) Recorrido por el campus - UAP 2025 | UAP | 4:25 | ~2:12 edificio de ladrillo y vidrio. ~3:19 glorieta blanca. Recorrido completo del campus |
| [28zk_AN-Bls](https://www.youtube.com/watch?v=28zk_AN-Bls) Recorriendo el campus de la UAP | Kev Suarez | 10:51 | Recorrido a pie. Miniatura: Pórtico. ~2:43 fachada de ladrillo con celosías |
| [J1jCO8BHEJo](https://www.youtube.com/watch?v=J1jCO8BHEJo) Universidad Adventista de Plata Tour, Parte 1 | Yuli Arte | 8:06 | ~2:01 edificio de ladrillo con letras "Universidad Adventista…". ~4:03 fachada de iglesia (Salón de los Pioneros). ~6:04 "Multimedia y el patio" |
| [2THMAddOfzA](https://www.youtube.com/watch?v=2THMAddOfzA) Conociendo la UAP | Mente Inquieta | 21:11 | ~5:18 escalinata y edificio oscuro. ~10:35 interior de Odontología. ~15:53 edificio FCS ("Ciencias…UAP") |
| [KoMv0SEn21Y](https://www.youtube.com/watch?v=KoMv0SEn21Y) TOUR HOGAR "NUEVO" FEMININO UAP | Kezz Miranda | 8:20 | **Hogar de Señoritas Nuevo**: exterior en la miniatura, interiores todo el video |
| [-mjdp-Vm0Vg](https://www.youtube.com/watch?v=-mjdp-Vm0Vg) Video Hogar de Señoritas | Rodillonforte | 1:41 | Habitaciones del hogar (interior) |
| [Uqvs9vF2TtM](https://www.youtube.com/watch?v=Uqvs9vF2TtM) Nuevas residencias universitarias | UAP | 1:46 | Miniatura: render del proyecto. ~0:53 estructura en obra |
| [9JPypo3uBP8](https://www.youtube.com/watch?v=9JPypo3uBP8), [snpSdQs0IAY](https://www.youtube.com/watch?v=snpSdQs0IAY) y otras transmisiones de liga APB/APV | Canal 2 LSM | 1-2 h | Interior del **Auditorio Mayor** (bóveda, tribunas, cancha) |
| [kzffvxhyO-Q](https://www.youtube.com/watch?v=kzffvxhyO-Q) Un poco de LSM - Drone DJI Mavic | LSM DRONE | 4:16 | **Dron** de la trama urbana: ~1:04 cenital, ~2:08 avenida, ~3:12 periferia |
| [H4hS06GZ2gI](https://www.youtube.com/watch?v=H4hS06GZ2gI) Rally Entrerriano 2021 - drone 4K | LSM DRONE | 6:45 | ~1:41 aérea de la localidad con edificio blanco grande (¿Sanatorio?). Revisar el resto del video |
| [hZNXRLpcbVQ](https://www.youtube.com/watch?v=hZNXRLpcbVQ) Villa Libertador San Martín | pibesnomades | 12:09 | ~6:05 y ~9:07 aéreas del borde urbano |
| [EtYEUmUFyyw](https://www.youtube.com/watch?v=EtYEUmUFyyw) Agujas 2022 LSM 4K | LSM DRONE | 2:00 | Dron sobre los obeliscos del acceso a la localidad (fuera del campus) |
| [gLambJ9GJ8c](https://www.youtube.com/watch?v=gLambJ9GJ8c) Alrededores de LSM 4K | cenproducciones | 2:24 | Aéreas rurales (fuera del campus) |
| [FX0DgKNTL0Q](https://www.youtube.com/watch?v=FX0DgKNTL0Q) LIBERTADOR SAN MARTÍN [4K] | Ausflug | 26:01 | Caminata de calle: ~6:30 calle arbolada, ~13:00 edificio gris con fachada escalonada, ~19:30 calle |
| [7L87aKw7--A](https://www.youtube.com/watch?v=7L87aKw7--A) Driving tour LSM 4K | Ponta do Gi | 18:49 | Recorrido en auto por las calles que rodean el campus |
| [3rBMMVXLmrc](https://www.youtube.com/watch?v=3rBMMVXLmrc), [AvAv5aQgbhU](https://www.youtube.com/watch?v=AvAv5aQgbhU) Espejo de mi Tierra | Elonce | ~5:00 | Biblioteca (acceso Chaij); fachada histórica de Ogden |
| [GG5_lf-ZDEM](https://www.youtube.com/watch?v=GG5_lf-ZDEM) Documental 125 años UAP | UAP | 28:13 | Interiores y fotos históricas (sin verificar) |
| [4T6DpnI8U8k](https://www.youtube.com/watch?v=4T6DpnI8U8k), [gQemudMHQ6E](https://www.youtube.com/watch?v=gQemudMHQ6E) | varios | — | Templo frontal y en 3/4 (miniaturas guardadas) |

Miniaturas guardadas en `reference/web/<edificio>/` y en `campus-general`.

## 3. Cobertura por edificio

Recuento de referencias tras esta pasada (entre paréntesis, las nuevas):

| Edificio | Refs | Frontal / 3-4 | Aérea | Interior |
|---|---|---|---|---|
| Templo UAP (way/388500961) | 16 (+13) | sí, buena | sí: dron, nocturna, miniaturas | sí, muy buena |
| Pórtico / Ex CAP (way/388521996) | 14 (+10) | sí, excelente (2015-2026) | sí: Instagram 2026 | — |
| Biblioteca Mohr / Chaij (way/388495172) | 15 (+9) | sí, buena | solo ortofoto | sí |
| Pabellón de Música Ogden (way/388510375) | 8 (+5) | sí: frontal con letrero y detalle | — | hall 2026 |
| Salón de los Pioneros (way/388512621) | 7 (+5) | sí: fachada neogótica (Elonce) | — | sí: escenario y balcón |
| FCS (way/388495176) | 6 (+4) | parcial: Odontología en obra 2018 | — | laboratorios de simulación |
| Auditorio Mayor (way/388500965) | 4 (+4) | **no** | solo ortofoto (bóveda de 82x35 m) | sí |
| Hogar de Señoritas Nuevo (way/388500978) | 1 (+1) | sí, una miniatura con texto encima | — | (video) |
| Torre UAP (way/388504307) | 1 (+1) | sí, 3/4 (identificación media) | — | — |
| IAP (relation/16816367) | 2 (+2) | no | — | aulas |
| PEF / Gimnasio (way/388500962) | 1 (+1) | no | — | cancha (identificación media) |
| campus-general | 27 (+19) | edificios de ladrillo no identificados, Museo del Conquistador, Librería, obra Fayard | dron 2017 y 2026, miniaturas | comedor |

Además, `reference/aerial/ign-rio-parana-2013-campus-osm-overlay.jpg` muestra las huellas OSM sobre la ortofoto para ubicar cada edificio.

## 4. Huecos pendientes

- **Sin ninguna foto exterior:** Lincoln Hall (way/388521982; aloja el Instituto de Idiomas), Administración/Rectoría (way/388521993), Hogar de Varones NUEVO (way/388510367), CAE (way/388510374), Edificio Humanidades (way/388512618) y Aulas Humanidades (way/388521983). Varios edificios de ladrillo de 2-3 pisos en `campus-general` (`Jornadas-de-Libertad-Religiosa`, `EgresadosCAP1967`, `univ01`, `admin01`) probablemente son alguno de estos, pero no se pudo confirmar cuál. Lo mejor es cruzar su orientación con la ortofoto.
- **Auditorio Mayor:** falta la fachada exterior; la forma sale de la ortofoto.
- **Ortofoto reciente:** la del IGN es de 2013. No tiene datos abiertos de edificios posteriores: Odontología (2015-2018), nuevas residencias (2024+), Fayard (2026). Para verlos queda el visor Esri o Bing (solo visualización) o las fotos de dron de UAP 2026.
- **Mapillary:** hace falta un token propio para consultar `graph.mapillary.com`. **KartaView:** no tiene imágenes en la zona.
- **Planos:** no hay masterplan ni plano del campus publicado. Solo está la planta del edificio Fayard. Podría pedirse a la Dirección de Proyectos Edilicios de la UAP o a la Municipalidad de LSM.
- **Facebook/Instagram:** el perfil exige login. Solo se pudieron bajar las 6 imágenes del feed embebido en la portada de uap.edu.ar.

## 5. Datos útiles para el modelado (texto)

- **Cronología** (hitos UAP, 2017):
  - 1908: edificio CAP, hoy Escuela de Música Ogden.
  - 1915: Hogar de Niñas, "Hogar Rosado".
  - 1922: Hogar de Varones viejo o "Celeste".
  - 1924: torre de 15 m, 4 pisos y tanque de agua.
  - 1930: capilla alemana.
  - 1946: templo del CAP, hoy Salón de los Pioneros.
  - 1958: Pabellón Teológico con observatorio.
  - 1961: comedor.
  - 1963: pórtico actual.
  - 1974: salón auditorio de usos múltiples de 82x35 m (Auditorio Mayor).
  - 1976: escuela primaria.
  - 2001: edificio Fernando Chaij (Biblioteca).
  - 2012: nuevo templo.
  - 2013: Facultad de Teología y CISS.
  - 2015: piedra fundamental de Odontología.
  - 2026: hall de Ogden y obra Fayard.
- **CONEAU:**
  - 1999: 18 edificios, 23.202 m2, 17 ha; Biblioteca de 2.500 m2 en 3 plantas; antena FM de 60 m.
  - 2017: 20 edificios, 47.141 m2; gimnasio de 3.766 m2; Templo para 2.500 personas.
- Los posts mencionan un "Hogar Azul" de señoritas y un "Hogar Rosado". Es probable que los colores identifiquen a los hogares viejos (way/388510368, way/388510369).
