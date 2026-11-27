# Casos de estudio: reconstruir lugares reales para juegos y 3D interactivo

> Investigación para el POC **Campus UAP** (three.js WebGPU/WebGL2, OSM + IGN + fotos, < 15 MB, celulares).
> Fecha: 2026-11-27. Documento de referencia: no modifica código.

## Cómo leer este documento

- Cubre **30 casos** en cuatro grupos: AAA, campus universitarios, indie y comunidad, y web. Cada caso describe datos, herramientas, el reparto entre lo procedural y lo manual, cómo se equilibró realismo y rendimiento, equipo y tiempo, y qué salió mal.
- **Confianza de las fuentes.** Algunos sitios (80.lv, techcrunch.com, destructoid.com, medium.com) no se pudieron abrir desde este entorno. Cuando un dato sale solo de resúmenes del buscador o de prensa secundaria, lo marco con *(secundaria)*. Lo demás se leyó en la fuente primaria o en Wikipedia con sus citas.
- La última sección, **"Lecciones para el Campus UAP"**, trae 15 recomendaciones priorizadas y mapeadas a rutas del repo.

---

## Resumen comparativo

| Caso | Datos base | Procedural / manual | Escala | Equipo / tiempo |
|---|---|---|---|---|
| MS Flight Simulator 2020/24 | Bing Maps (satélite + fotogrametría aérea), OSM, IA de Blackshark | ~100 % procedural/IA para el mundo, landmarks y aeropuertos a mano | 1:1 planetaria | Asobo + Blackshark; World Updates por región |
| GTA V | ~250 000 fotos, video, Google Maps, censo | Mano, con referencia masiva | **Condensada** (~1/80 del condado de LA) | Cientos; años |
| Marvel's Spider-Man | Manhattan real + reglas procedurales | Procedural para "vestir" la ciudad, landmarks a mano | **Condensada**, Central Park como ancla | ~800 tiles de 128 m |
| AC Unity (París/Notre-Dame) | Planos, historiadores | Mano (landmark) | ~1:1 en el núcleo, Notre-Dame proporcional 1:1 | 1 artista, más de 1–2 años en Notre-Dame |
| Watch Dogs 2 / Legion | Viajes, más de 200 h de video de arquitectura | Mano + sistemas de población procedural | Condensada (Silicon Valley la más reducida) | Más de 2 años de viajes |
| The Division 1/2 | Street View para el blockout, datos catastrales | Huella "gratis" desde catastro, narrativa a mano | 1:1 (1/3 de Manhattan; DC 68 mi²) | Massive; "world bible" de una pulgada de grosor |
| Forza Horizon 5/6 | Fotogrametría, cielos HDR 8K, consultor local | Mixto | **Condensada** ("la esencia, no milla por milla") | Viajes; 75 TB de cielo en FH5 |
| Mafia III | Archivo histórico de Nueva Orleans | Mano | Ciudad ficcionalizada | Hangar 13 |
| Yakuza (Kamurocho) / Shenmue (Dobuita) | Calles reales, fotos aéreas, arquitectos | Mano y reutilización durante 20 años | Pequeña y **densa** | Sega/RGG |
| Chernobylite | Escaneo láser + fotogrametría in situ, drones | Escaneo + mano | Lugares reales | The Farm 51 (AA); Kickstarter para escanear |
| Blockeley (UC Berkeley) | Topografía + Google Earth + memoria de los alumnos | Mano (bloques) | 1:1 | 7 → cientos de voluntarios; estadio en ~1 semana |
| Penn / Tec / Princeton / USU | Google Maps/Street View, planos de archivo, YouTube | Mano | 1:1 aproximado | 8–20 activos; semanas a meses |
| Univ. de Colonia / Lanzhou Jiaotong | Dron oblicuo, DEM, OSM, BIM → 3D Tiles | Pipeline GIS | 1:1 georreferenciado | Proyectos académicos |
| Build The Earth | OSM + elevación (Terra++) + fotos | Terreno procedural, edificios a mano | 1:1 | Más de 100 000 en Discord; 2000 solo para NYC |
| Arnis / Blosm / OSM2World | OSM + DEM | 100 % procedural | 1:1 | Herramientas open source |
| Streets GL / OSM Buildings | OSM (Simple 3D Buildings) | 100 % procedural en el cliente | 1:1 | 1 autor (Streets GL) |
| 3DTilesRendererJS / Cesium | 3D Tiles (fotogrametría, BIM) | Datos escaneados | 1:1 | NASA-JPL → open source |
| Bruno Simon folio | Blender → GLB + KTX2 | Mano, estilizado | Escena chica | 1 persona |
| Gaussian splats web (Spark, SPZ, SOG) | Fotos o video de celular | Captura automática | 1:1 | 1 persona por escena |

---

## Grupo 1 — Mundos abiertos AAA basados en lugares reales

### 1. Microsoft Flight Simulator 2020 / 2024 (Asobo + Blackshark.ai)

- **Datos.** Bing Maps, con imagen satelital y fotogrametría aérea de alta resolución ("más de dos petabytes" de datos en Azure). Blackshark.ai usa IA para detectar huellas de edificios, vegetación y rutas en la imagen satelital. Las alturas salen de OSM o se estiman. Wikipedia cita 1500 millones de edificios y 2 billones de árboles. [Wikipedia – MSFS 2020](https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)) · [Blackshark.ai – Flight Simulation](https://blackshark.ai/?p=1635) · [TechCrunch: la startup que construyó el mundo de MSFS](https://techcrunch.com/2020/08/17/meet-the-startup-that-helped-microsoft-build-the-world-of-flight-simulator) *(secundaria)*
- **Procedural vs. manual.** Casi todo el planeta es "autogen": huella detectada, fachada "pintada" según el estilo típico de la zona. Más de 500 ciudades tienen fotogrametría (malla texturizada del vuelo aéreo). Los **landmarks y aeropuertos se hacen a mano** y llegan en *World Updates* regionales; el World Update II (EE. UU.) trajo 50 estructuras a mano, entre ellas el Strip de Las Vegas. [Xbox Wire – World Update XVII](https://news.xbox.com/en-us/2024/07/24/biggest-world-update-ever-microsoft-flight-simulator-best-yet/) · [FlyAway – ciudades fotogramétricas 2024](https://flyawaysimulation.com/ask/answers/msfs-2024-photogrammetry-cities-areas/) *(secundaria)*
- **Realismo vs. rendimiento.** Hay streaming desde la nube por zonas, y la fotogrametría convive con el autogen según dónde estés.
- **Qué falló.** Esto es lo más útil para nosotros. El Washington Monument salió como rascacielos genérico y el Palacio de Buckingham como bloque de oficinas. Un **error de tipeo en la altura de un edificio en OSM** (Melbourne) generó una torre de **212 pisos** en un suburbio. Las palmeras salieron como obeliscos. Además, el **70 % de los jugadores voló primero a su casa**: lo que más se juzga es el lugar propio. [Wikipedia – recepción](https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)) · [foro oficial: autogen pobre en 2023-24](https://forums.flightsimulator.com/t/with-the-power-of-ai-these-days-as-in-2023-24-rather-than-2020-im-surprised-auto-gen-buildings-in-fs2020-still-look-so-poor-in-many-places/633094?page=3)
- **Lección.** El procedural da la "masa" de la ciudad, pero sin landmarks hechos a mano el lugar no se reconoce. Hay que **validar los datos de OSM con límites de cordura**: alturas máximas por tipo y avisos.

### 2. GTA V (Rockstar) y GTA VI

- **Datos.** Viajes de campo con guías y **historiadores de arquitectura**: unas **250 000 fotos** y horas de video. Usaron proyecciones de Google Maps y Street View para la red vial, además de globos virtuales, censo y documentales para la distribución demográfica. [Wikipedia – Development of GTA V](https://en.wikipedia.org/wiki/Development_of_Grand_Theft_Auto_V) · [GamesRadar – Los Santos](https://www.gamesradar.com/los-santos-gta-grand-theft-auto-iconic-city)
- **Escala.** **Condensada a propósito**. Houser buscaba "la esencia de lo que hay en una ciudad, en un área mucho más chica". El mapa cubre 130 km², cerca de 1/80 del condado de Los Ángeles. Garbut: no estaban "dictados por la realidad". Se concentraron en una sola ciudad para hacerla mejor que las tres de San Andreas. Para GTA VI la prensa reporta años de investigación de campo en Florida. [GamesRadar – investigación GTA VI](https://www.gamesradar.com/games/grand-theft-auto/gta-6-devs-spent-years-going-to-strip-clubs-spending-time-on-the-beach-and-riding-with-ex-cops-to-research-florida-life/) *(secundaria)*
- **Qué fue difícil.** Houser consideró la investigación y la creación del mundo abierto lo más difícil de toda la producción. Para evitar un campo "hueco" poblaron el mundo de fauna.
- **Lección.** La foto de referencia es **materia prima de diseño, no un calco**. Condensar sirve cuando el original es enorme. Nuestro campus no lo es (ver lecciones).

### 3. Marvel's Spider-Man (Insomniac, 2018) y Spider-Man 2

- **Pipeline.** Charla GDC 2019 de David Santiago, *Procedurally Crafting Manhattan*. Los sistemas procedurales se diseñaron para iterar con dependencias y terminaron generando "mucho más contenido del planeado". La charla de *look* explica cómo un equipo chico de environment y materiales cubrió la ciudad con Substance Designer y herramientas internas. [GDC Vault 1026496](https://gdcvault.com/play/1026496) · [GDC Vault 1025765 – Technical Postmortem](https://gdcvault.com/play/1025765) · [80.lv – look de Manhattan](https://80.lv/articles/spider-man-a-deep-dive-into-the-look-creation-of-manhattan)
- **Escala.** Es una "**versión reducida de Nueva York** que junta landmarks como Wall Street y Trinity Church". El director Ryan Smith cuenta que **Central Park fue el ancla**: "define el tamaño total de la isla". Probaron varios tamaños. Cada distrito tiene altura y trama propias (Financial District alto, Hell's Kitchen más bajo) y eso cambia cómo se juega. [Game Developer – Making Insomniac's Spider-Man](https://www.gamedeveloper.com/design/making-insomniac-s-i-spider-man-i-do-what-a-spider-can)
- **Rendimiento.** Unos **800 tiles de 128 × 128 m** en streaming, cerca de un tile por segundo a velocidad máxima. Toda la arquitectura está etiquetada con puntos de enganche de la telaraña. [PlayStation Blog – la tecnología de Spider-Man](https://blog.playstation.com/2018/09/06/insomniac-interview-the-tech-behind-marvels-spider-man/)
- **Lección.** Hay que elegir **anclas perceptivas** (el elemento que define el tamaño en la memoria de la gente) y respetarlas. Lo demás puede ser procedural. Hay además una mecánica de "fotos de landmarks" que convierte el reconocimiento del lugar en juego.

### 4. Assassin's Creed Unity (Ubisoft): París y Notre-Dame

- **Escala.** Wikipedia la describe como "aproximadamente 1:1", pero el director de diseño de mundo admitió que la París revolucionaria es "un poco más chica que la real". Según Kotaku, Notre-Dame es **proporcionalmente 1:1**. Un cuarto de los edificios tiene interiores. [Wikipedia – AC Unity](https://en.wikipedia.org/wiki/Assassin%27s_Creed_Unity) · [TechRadar – Inside AC Unity](https://www.techradar.com/news/gaming/inside-assassin-s-creed-unity-ubisoft-s-leap-of-faith-1268435) · [Engadget – explorando París](https://www.engadget.com/2014/10/06/ubisoft-assassins-creed-paris/)
- **Landmark manual.** La artista Caroline Miousse pasó **más de dos años** con Notre-Dame. Wikipedia dice "bastante más de un año". Trabajó con planos y con el historiador Maxime Durand, **sin haber visitado nunca la catedral**. Ella misma aclaró que nunca iba a ser 100 % exacta, en parte por derechos sobre agregados modernos. [SIGGRAPH Blog – cómo Ubisoft recreó Notre-Dame](https://blog.siggraph.org/?p=5940) · [Destructoid](https://www.destructoid.com/one-dev-spent-two-years-making-the-notre-dame-in-assassins-creed-unity/) *(secundaria)*
- **Lección.** Un hero asset de calidad consume tiempo desproporcionado. Conviene limitarlos a muy pocos edificios y dejar que la fidelidad del resto la lleve un **kit modular** (Syndicate usó kits de "cientos de módulos"). [Polycount – kit de AC Syndicate](https://polycount.com/discussion/comment/2386999/)

### 5. Watch Dogs 2 (San Francisco) y Watch Dogs: Legion (Londres)

- **Datos.** Más de dos años de viajes a la Bahía, caminando las calles y hablando con la gente. La directora de arte Sidonie Weber juntó **más de 200 horas de video** solo de arquitectura. [Wikipedia – Watch Dogs 2](https://en.wikipedia.org/wiki/Watch_Dogs_2) · [Game Developer – San Francisco como marco](https://gamedeveloper.com/design/using-san-francisco-as-the-framework-for-i-watch-dogs-2-i-) *(secundaria)*
- **Escala.** No reprodujeron los nueve condados. Según el productor Dominic Guay, Silicon Valley fue "el área que más tuvimos que achicar". [GamesBeat – entrevista](https://gamesbeat.com/why-watch-dogs-2-creators-chose-to-focus-on-san-franciscos-hacktivism/3/) *(secundaria)*. En Legion, Londres también es una versión condensada del centro, con landmarks casi idénticos como Tower Bridge. [GamesRadar – mapa de Legion](https://www.gamesradar.com/uk/watch-dogs-legion-map) *(secundaria)*
- **Procedural.** En Legion, *Census* genera habitantes con demografía coherente, horarios y relaciones. Taggear el mundo entero fue "una hazaña enorme" y afinar lo procedural exigió mucho ajuste. [Ubisoft News – The Tools That Built London](https://news.ubisoft.com/en-ca/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london)
- **Lección.** **La vida (gente, horarios) pesa tanto como la arquitectura** para que un lugar se sienta real. Para el campus, eso significa estudiantes caminando entre clases a la hora del día que corresponde.

### 6. The Division (Manhattan) y The Division 2 (Washington DC)

- **Datos.** Para cada zona, "el primer paso siempre es Google Street View" (por ejemplo, W 57th St). Primero hacen un *blockout* a escala con proporciones correctas y después buscan el *look and feel*, no la copia. [80.lv – The Division parte 1](https://80.lv/articles/division-pt-1) *(secundaria)*. En DC usaron **datos catastrales oficiales** para digitalizar la base: "nos llevamos la huella de la ciudad gratis", lo que ahorró cientos de horas-persona. [PlayStation Blog – The Division 2](https://blog.playstation.com/2019/02/07/the-division-2-the-full-scale-construction-and-destruction-of-a-city/)
- **Escala.** 1:1 en ambos: un tercio de Manhattan en el primero y 68 mi² de DC en el segundo.
- **Qué fue difícil.** La trama en grilla de Manhattan resultó monótona para jugar, con solo dos "biomas". DC tiene seis. El trabajo real estuvo en la **"world bible"** que, distrito por distrito, responde "¿qué pasó acá?".
- **Lección.** Nosotros ya tenemos la huella gratis (OSM + IGN). El valor diferencial está en **contar historias por edificio**, y el panel de `buildings-info.json` es el lugar para eso.

### 7. Forza Horizon 5 (México) y Forza Horizon 6 (Japón)

- **FH5.** Once biomas investigados in situ con referencia y fotogrametría ("recrear el entorno con precisión"). Los cielos se capturaron con un rig de 3 cámaras 8K: **48 000 fotos, 75 TB**, enviadas en discos porque no se podían subir. [Xbox Wire – biomas FH5](https://news.xbox.com/en-us/2021/07/26/exploring-the-biomes-and-seasons-of-forza-horizon-5/) · [TweakTown – cielos FH5](https://www.tweaktown.com/news/80373/forza-horizon-5s-skies-48-000-8k-image-captures-worth-75tb-of-data/index.html) *(secundaria)*
- **FH6.** "El objetivo no era recrear Japón milla por milla sino **capturar la esencia en una realidad condensada**". Otra cita: "no recreás cada esquina, recreás **la experiencia de que algo se revele al doblarla**". El viaje mostró lo valioso de tener a **alguien que conozca el lugar**, y contrataron un consultor local. Tokio tuvo un equipo dedicado. [Xbox Wire – FH6 Developer Direct](https://news.xbox.com/en-us/2026/01/22/forza-horizon-6-developer-direct-breakdown-interview/) · [PC Gamer – FH6 Japón](https://www.pcgamer.com/games/racing/the-team-wanted-to-present-more-than-a-postcard-or-a-backdrop-forza-horizon-6-devs-credit-road-trips-and-hot-wheels-dlc-for-upcoming-racer)
- **Lección.** El **cielo y la luz** son un tercio de la identidad visual: FH5 invirtió en capturarlos en el lugar. Además, conviene sumar **validadores locales** desde el principio.

### 8. Mafia III (New Bordeaux = Nueva Orleans 1968)

- **Datos.** Archivos de época, video de stock y fotos en blanco y negro. Reconstruyeron lugares que ya no existen, como una ópera de Bourbon St. Es una ciudad **ficcionalizada**, y el criterio para elegirla fue "¿la ciudad es icónica y puede ser un personaje?". [PlayStation Blog – Mafia III](https://blog.playstation.com/2016/10/04/mafia-iii-the-city-the-year-the-hero/) · [Game Informer – Building the Big Easy](https://gameinformer.com/b/features/archive/2015/10/09/building-the-big-easy-how-hangar-13-reconstructed-new-orleans-for-mafia-iii) *(secundaria)*
- **Lección.** Si algún día se quiere un modo "campus histórico" (como el Blockeley de 1893), se arma con archivo fotográfico institucional.

### 9. Yakuza / Like a Dragon (Kamurocho = Kabukichō) y Shenmue (Dobuita, Yokosuka)

- **Kamurocho.** Recreación casi idéntica de la cartelería y de edificios clave (el Kamuro Theater = Shinjuku Toho). **Sega reutilizó el mismo mapa durante unos 20 años**. Según el diseñador Eiji Hamatsu, funciona porque es un espacio "**confinado pero de alta densidad**". Las ciudades occidentales, con comercios solo en planta baja, necesitan más espacio. [PC Gamer – arquitectura japonesa y reutilización](https://www.pcgamer.com/games/action/a-unique-aspect-of-japanese-architecture-turned-out-to-be-a-key-reason-the-like-a-dragon-games-can-reuse-assets-so-effectively-and-deliver-more-compact-memorable-open-worlds-than-western-cities) · [Engadget – Yakuza 6 vs. Kabukichō](https://www.engadget.com/2018/03/15/yakuza-6-kabukicho-real-life-comparison/)
- **Shenmue (1999).** Dobuita se modeló con fotos aéreas y mapas detallados. Hubo arquitectos y decoradores para más de 1200 habitaciones, y el clima se generó a partir de registros meteorológicos de 1986. [Wikipedia – Shenmue](https://en.wikipedia.org/wiki/Shenmue_(video_game)) · [Sega Retro – desarrollo](https://segaretro.org/Shenmue/Development) *(secundaria)*
- **Lección.** **Un área chica y densa es memorable y reutilizable.** Un campus de ~0,5 km² es exactamente eso, siempre que la densidad de detalle se concentre en los ejes peatonales.

### 10. Chernobylite (The Farm 51): escaneo de un lugar real con presupuesto AA

- **Datos.** Mapa construido con **escaneos 3D de la Zona de Exclusión**: fotogrametría (Nikon D7500), escáner láser Faro y drones. Hicieron cinco viajes en el proyecto VR previo. Juntaron el dinero para terminar el escaneo con un Kickstarter de más de USD 100 000. [Wikipedia – Chernobylite](https://en.wikipedia.org/wiki/Chernobylite_(video_game)) · [80.lv – Chernobylite basado en Chernobyl escaneado](https://80.lv/articles/chernobolyte-game-based-on-3d-scanned-chernobyl/) *(secundaria)*
- **Lección.** Hasta un estudio mediano necesita **logística de campo** (viajes, permisos, financiamiento) para escanear. Planificar la captura es tan importante como procesarla.

---

## Grupo 2 — Universidades y campus recreados

### 11. Blockeley (UC Berkeley en Minecraft, 2020–)

- **Datos.** Convirtieron un escaneo topográfico de la NASA en un mundo de Minecraft con un editor de mundos. Las dimensiones aproximadas salieron de Google Earth. Para el estadio (Memorial Stadium) contaron mucho la **memoria de los alumnos**: integrantes de la banda y del Rally Committee. [Wikipedia – Blockeley](https://en.wikipedia.org/wiki/Blockeley)
- **Equipo y tiempo.** Empezaron el 15 de marzo de 2020. Unos 7 constructores terminaron el estadio en cerca de una semana. Un post en el grupo de Facebook del campus llevó el Discord de 10 a más de 1000 personas, y más de 500 se anotaron por formulario de Google. Replicaron **más de 100 edificios** a escala 1:1 y la universidad lo usó para las graduaciones de 2020 y 2021. Después siguieron con un campus histórico de 1893. [Berkeley News – Blockeley 1893](https://news.berkeley.edu/2021/05/07/blockeleys-back-with-an-1893-campus-and-a-bancroft-library-archive/) · [Berkeley Library – Fiat Blocks](https://www.lib.berkeley.edu/about/news/fiat-blocks)
- **Legal.** Se rebautizó "Blockeley" para **evitar conflictos por el uso del nombre de la universidad**.
- **Lección.** La comunidad del campus es la mejor fuente y la mejor fuerza de trabajo. Un **llamado público con formulario** escala de 7 a cientos de personas.

### 12. Penn (Penncraft), Tec de Monterrey, MIT, RIT y otros en Minecraft

- **Penn.** Arrancó el 16 de marzo de 2020 por Locust Walk, con referencia de Google Maps/Street View y **planos y fotos de archivo de Penn Libraries**. Unos 20 constructores activos y cerca de 300 visitantes. Hicieron allí unas Penn Relays virtuales. [Penn Engineering – Meet the students](https://www.engineering.upenn.edu/stories/meet-the-penn-students-recreating-campus-in-minecraft-e1c6be404e36/) · [Penn Almanac](https://almanac.upenn.edu/articles/recreating-penns-campus-on-minecraft-virtual-penn-community)
- **Tec de Monterrey.** Campus Estado de México y Guadalajara. Usaron Google Maps para las instalaciones, recrearon paisajismo e interiores de aulas, y llegaron a ~90 % en tres semanas con unas 20 personas a la vez. [Conecta Tec](https://conecta.tec.mx/en/node/128191) *(secundaria)*
- Casos similares: [MIT](https://news.mit.edu/index%2ephp/2020/building-and-reconnecting-mit-minecraft-0407), [RIT](https://www.rit.edu/alumni/news/students-use-minecraft-recreate-digital-rit-campus), [U of T Mississauga](https://utoronto.ca/news/students-bring-u-t-mississauga-campus-life-minecraft-s-3d-world).
- **Qué fue difícil.** Muchos edificios quedaron con exterior y sin interior, y las torres llegaron al final. Los edificios "espectaculares" se terminan primero.
- **Lección.** Primero se hace lo icónico y los recorridos peatonales; el resto llega después o nunca. Los **archivos de la biblioteca universitaria** (planos y fotos históricas) son una fuente legítima y poco explotada.

### 13. Princeton (Roblox, 2020) y Utah State (Roblox, 2026)

- **Princeton.** Tres estudiantes; uno de ellos había empezado meses antes como hobby arquitectónico. Pasó "**cientos de horas** estudiando el campus en videos de YouTube, fotos online y Google Earth". Los colegios residenciales fueron lo más difícil. La programación empezó un mes antes del evento y tuvieron que recortar ideas. Llegaron a 52 edificios y más de 100 personas simultáneas. [Daily Princetonian](https://dailyprincetonian.com/article/2020/06/members-of-the-princeton-class-of-2024-unveil-virtual-interactive-campus-in-roblox)
- **USU "Aggie Campus Life" (2026).** Lo hizo marketing institucional junto con alumnos de diseño (programa HEDI), con interiores, actividades diarias y una foto con la mascota. Nació como proyecto de una materia. [USU Today](https://www.usu.edu/today/story/usu-offers-virtual-campus-experience-through-roblox/)
- **Lección.** El gancho no es la réplica sino **las actividades del lugar**: feria de clubes, búsqueda del tesoro, "ganar el título". Un campus vacío se siente museo.

### 14. Gemelos digitales de campus: Universidad de Colonia y Lanzhou Jiaotong

- **Colonia (UoC Virtual Campus, 2026).** Modelo 3D georreferenciado publicado como **OGC 3D Tiles**, con una suite de herramientas propia (3DTiler) y solo software y estándares abiertos. Lo usan un visor web, AR/VR y posicionamiento indoor. [ISPRS Annals XI-4-2026, 349](https://isprs-annals.copernicus.org/articles/XI-4-2026/349/2026/)
- **Lanzhou Jiaotong.** Combina fotografía **oblicua con dron**, DEM, edificios de OSM, BIM y satélite, y se ve en Cesium web. [IJGI 14(1):19 (MDPI)](https://www.mdpi.com/2220-9964/14/1/19) *(secundaria)*
- **Lección.** El enfoque GIS prioriza la exactitud y el streaming, no el presupuesto de 15 MB. Su receta de captura (dron oblicuo + DEM + OSM) sí sirve como **referencia** para nuestros edificios, aunque no la publiquemos como malla.

### 15. Mapas de campus 3D en la web (three.js y comerciales)

- Proyectos abiertos: el [mapa UCSC](https://awesome.ecosyste.ms/projects/github.com%2Fbkcastro%2Fucscmap) dibuja GeoJSON de OSM en three.js. [IGDTUW](https://awesome.ecosyste.ms/projects/github.com%2Fdivi-24%2Figdtuw) combina Blender, GLB y GSAP. En el hackatón [Phoghorn](https://devpost.com/software/phoghorn) (R3F), **alinear las coordenadas de Blender con el mundo three.js** llevó muchas iteraciones.
- Comercial: [Concept3D](https://concept3d.com/use-cases/higher-education-2/) vende mapas y tours de campus a universidades, en general 2.5D con fotos 360°.
- **Lección.** Nuestro contrato de hero assets (origen en el centroide de la huella, Y=0, X=Este, −Z=Norte; `README.md` y `specs/011-hero-assets.md`) resuelve justo el problema que trabó a Phoghorn. Hay que mantenerlo y validarlo con un test.

---

## Grupo 3 — Indie, solo y comunidad: "mi ciudad en un juego"

### 16. Build The Earth (Minecraft 1:1)

- **Datos.** Terra++ genera el terreno y las calles con **OSM (ODbL)** y elevación. Los voluntarios construyen a mano con fotos de referencia. Tras probar Mercator pasaron a una proyección Dymaxion modificada. [Wikipedia – Build the Earth](https://en.wikipedia.org/wiki/Build_the_Earth) · [Terra++](https://github.com/bitbyte2015/terraplusplus)
- **Escala del esfuerzo.** Más de 100 000 personas en Discord en abril de 2020. Para NYC 1:1 hubo más de 2000 jugadores (2022) y para Portugal más de 400. Stawiszyn (Polonia) es la primera ciudad terminada al 100 %, en 2025. El fundador se fue en 2024 y el proyecto sigue en manos de la comunidad.
- **Qué fue difícil.** La proyección, los límites de altura (Cubic Chunks) y coordinar equipos regionales.
- **Lección.** Generar el terreno y los ejes automáticamente y dejar el detalle humano para la comunidad es el mismo patrón que ya usa el repo (`tools/build-world.ts`).

### 17. Arnis (OSM → Minecraft) y herramientas OSM → 3D (Blosm, OSM2World)

- **Arnis.** En Rust, lo empezó un estudiante en 2022. Lleva cerca de 900 000 descargas y unos 70 colaboradores. Consulta Overpass por bbox y usa AWS Terrain Tiles. **"Si un elemento no está mapeado, Arnis no puede colocarlo"**: lo que no está en OSM no existe. Para estructuras demasiado complejas (Estatua de la Libertad, Cristo Redentor) convierte modelos 3D hechos a mano. [GitHub Blog – Arnis](https://github.blog/open-source/maintainers/arnis-turns-any-place-on-earth-into-a-minecraft-world) · [repo louis-e/arnis](https://github.com/louis-e/arnis)
- **Blosm** (add-on de Blender). Importa terreno de ~30 m, edificios OSM sin textura (las texturas son premium) y caminos como curvas. Primero el terreno, después OSM. También importa Google 3D Cities, que **no debe usarse aquí**. [Blosm – documentación](https://github.com/vvoovv/blosm/wiki/Documentation) · [wiki OSM Blender-osm](https://wiki.openstreetmap.org/wiki/Blender-osm)
- **OSM2World.** Exporta glTF/GLB con PBR si se configura un set de texturas. Su propia wiki advierte que la visualización es de calidad baja y pensada para depuración. Para texturas a medida en techos y fachadas, la comunidad recomienda editar el GLB en Blender. [wiki OSM2World](https://wiki.openstreetmap.org/wiki/OSM2World) · [FOSDEM 2026 – OSM2World](https://fosdem.org/2026/schedule/event/osm2world_3d_rendering_openstreetmap_data) · [foro: texturas propias](https://community.openstreetmap.org/t/requesting-osm2world-support-adding-custom-building-roof-and-texture-images/101113)
- **Lección.** Para hero assets, un buen arranque es **Blosm u OSM2World → Blender** (huella exacta, ya georreferenciada) y después modelar a mano encima. Es el mismo patrón "Statue of Liberty" de Arnis.

### 18. Cities: Skylines con mapas reales

- **Pipeline.** Heightmap (terrain.party, que falla seguido, o heightmap.skydark.pl) + mods de importación de calles OSM (Cimtographer → OSM Import). Los jugadores recomiendan una **captura de pantalla como overlay** para ajustar a mano ríos y calles, porque la importación automática "clipea" contra el terreno. En CS2 existe el [CS2 OSM Toolkit](https://www.patreon.com/cw/CS2OSMToolkit). [Steam – hilo heightmaps](https://steamcommunity.com/app/255710/discussions/0/610574394239429098?l=german) · [Prima – importar mapas reales](https://primagames.com/gaming/how-to-import-maps-cities-skylines)
- **Lección.** Las calles de OSM sobre un DEM de 30 m siempre necesitan **corrección local**. El repo ya suaviza el terreno (σ = 20 m); la ortofoto IGN de 0,25 m (`reference/aerial/`) sirve de overlay para validar.

### 19. Hometowns en Unreal/Unity/Godot

- **Damascus digital twin** (UE4 → UE5): un desarrollador hace "un gemelo digital de mi ciudad natal", con prototipos desde 2020. [Unreal Forums](https://forums.unrealengine.com/t/damascus-city-digital-twin-v2-0-prototype-01/1861888)
- **Generation Streets**: un juego/simulador de vuelo basado en OSM para "cargar tu ciudad y volar alrededor de tu casa". [Foro OSM](https://community.openstreetmap.org/t/generation-streets-3d-osm-based-videogame-open-source-rvtgen3d/84772)
- **Unity + Houdini + OSM**: pipeline procedural de ciudades. [80.lv](https://80.lv/articles/generating-cities-with-unity-houdini-openstreetmap-data) *(secundaria)*. Frogwares armó una ciudad real en un día con su generador. [80.lv – Frogwares](https://80.lv/articles/frogwares-recreates-istanbul-with-a-city-generator) *(secundaria)*
- **Zlín City: Arch Moderna** (polyperfect): la ciudad natal del autor en UE5, con modelado, impresión 3D, pintura a mano y escaneo. Otro artista combinó fotogrametría y datos de terreno para recrear su patio. [80.lv – modelos hechos a mano + fotogrametría](https://80.lv/articles/this-indie-game-features-hand-made-models-brought-to-3d-with-photogrammetry) *(secundaria)*
- **A gran escala con dron**: en los foros de Unreal hay un escaneo de ciudad de unas 2500 acres hecho con **15 000 fotos** de dron + RealityCapture. [Unreal Forums – ciudad entera con RealityCapture](https://forums.unrealengine.com/t/entire-city-with-reality-capture/1325549)
- **Qué falla siempre.** El generador saca el 80 % en un día; el 20 % que hace reconocible el lugar lleva meses. Las mallas de dron de una ciudad entera no entran en tiempo real sin una reducción enorme.

### 20. Lo que **no** hay que hacer: capturar mallas de Google con RenderDoc

- **MapsModelsImporter** (add-on de Blender) captura con RenderDoc la geometría fotogramétrica que Google Maps dibuja en el navegador. Su propio README dice "solo con fines educativos". Las mallas tienen copyright de Google y de los proveedores (CNES/Airbus, Maxar, etc.). [GitHub – MapsModelsImporter](https://github.com/eliemichel/MapsModelsImporter) · [Fabbaloo – "muy probablemente contra los ToS"](https://www.fabbaloo.com/blog/2020/4/24/an-unusual-method-to-capture-global-scenes-in-3d)
- **Estado en el repo.** Está bien que `specs/012-references.md` (REF-2) ya bloquee dominios de Google.

---

## Grupo 4 — Web: ciudades reales en el navegador

### 21. Streets GL (OSM 3D en WebGL2)

- **Pipeline.** TypeScript con un wrapper propio de WebGL2 y un **render graph**. Los vector tiles de OSM se generan con un Planetiler modificado; el terreno viene de Esri Terrain 3D. **La geometría de edificios se genera al vuelo en el cliente** según el esquema *Simple 3D Buildings* (`building:levels`, `roof:shape`, `roof:colour`, `building:part`…). Tiene sombreado diferido PBR, TAA, SSAO, SSR, bloom y atmósfera. [README Streets GL](https://github.com/StrandedKitty/streets-gl) · [wiki OSM – Streets GL](https://wiki.openstreetmap.org/wiki/Streets_GL)
- **Rendimiento.** El README admite que "probablemente necesites una **GPU discreta moderna**". Hubo quejas por el rendimiento en Apple Silicon. Es de un solo autor y está sin mantenimiento desde 2024. [foro OSM – Streets GL](https://community.openstreetmap.org/t/streets-gl-a-new-3d-renderer-for-osm/98594?page=4)
- **Lección.** Es el pariente más cercano a nuestro pipeline. Demuestra que **OSM bien taggeado alcanza para un edificio creíble**, y que una cadena de post-procesado de escritorio no sirve para celulares. Nuestros presets (`specs/010-quality.md`) deben apagar AO, SSR y bloom en `low`.

### 22. OSM Buildings y F4 Map

- **OSM Buildings.** Biblioteca JS de extrusión 2.5D (Leaflet u OpenLayers, GeoJSON con `height`, `minHeight` y `roofColor`). En el nivel LOD1 de Simple 3D Buildings el techo se dibuja siempre plano. La wiki lo lista como **sin mantenimiento desde 2020**. [wiki OSM – OSM Buildings](https://wiki.openstreetmap.org/wiki/OSM_Buildings) · [Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings)
- **Lección.** La extrusión plana es "maqueta": se lee como mapa, no como lugar. Hacen falta techos, aberturas y materiales, y eso ya existe en el Hito 3.

### 23. 3DTilesRendererJS y Cesium: gemelos digitales con 3D Tiles

- **Pipeline.** Lo desarrolló NASA-JPL y hoy es open source. Soporta three.js, Babylon y PlayCanvas. El `BatchedTilesPlugin` usa `BatchedMesh` para bajar draw calls y hay *fade* entre LODs para evitar el pop-in. [README 3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) · [Cesium – mejoras al renderer de three.js](https://cesium.com/blog/2024/09/11/enhancements-to-the-threejs-3d-tiles-renderer/)
- **Casos.** Uzufly genera modelos de ciudad con fotos aéreas y los sirve vía Cesium ion. [Cesium – Uzufly](https://cesium.com/blog/2022/10/04/uzufly-creates-ultra-high-def-city-scale-3d-models-cesium) · [Purdue XR](https://cesium.com/blog/2026/04/22/purdue-university-exploring-the-boundaries-of-xr-w/)
- **Lección.** Con streaming, 3D Tiles permite datasets grandes, pero rompe el modelo de "carga inicial < 15 MB, después offline" y depende de un servidor. Para nosotros **no compensa**, salvo un futuro modo "vista aérea fotogramétrica" propio y opcional.

### 24. Google Photorealistic 3D Tiles: **solo como ejemplo de qué NO hacer**

- Las políticas de Map Tiles API prohíben **exportar, extraer o scrapear** el contenido fuera de los servicios de Google y **crear contenido basado en él**, incluido "construir modelos 3D o de terreno" o "trazar o digitalizar desde imagen satelital". También prohíben superponer objetos propios **"extraídos, trazados o derivados a mano o por máquina"** de los Photorealistic 3D Tiles. Por esos términos, Cesium no permite usar Clips con ellos. [Map Tiles API – Policies](https://developers.google.com/maps/documentation/tile/policies) · [Cesium community – exportar para Unreal](https://community.cesium.com/t/export-google-3d-tiles-for-unreal/38007)
- **Consecuencia.** Tampoco sirve **calcar alturas o fachadas** mirando los tiles de Google. Las fuentes válidas son OSM, IGN, fotos propias y fotos institucionales con permiso (REF-6).

### 25. Bruno Simon: el portfolio como juego (folio 2019 y 2025)

- **Pipeline.** Modelos en Blender exportados a GLB **sin compresión** y comprimidos después con un script: texturas a **KTX2 ETC1S** con gltf-transform/toktx y UI a WebP. La textura de paleta se silencia en Blender y se asigna en el material de three.js (una sola paleta para toda la escena). El game loop tiene **orden explícito por fases**: física → vehículo → vista → clima → follaje → render. La física usa primitivas simples, no la malla visual. La versión 2025 usa TSL y corre en WebGPU cuando hay. [README folio-2025](https://github.com/brunosimon/folio-2025) · [Mux – charla con Bruno Simon](https://www.mux.com/blog/3d-web-development-and-beyond-a-chat-with-bruno-simon) · [Awwwards – case study 2019](https://www.awwwards.com/brunos-portfolio-case-study.html)
- **Lección.** **Estilo coherente > fotorrealismo inconsistente.** Una paleta compartida y texturas ETC1S dan identidad con pocos MB. El repo ya usa KTX2 y meshopt; vale la pena sumar el paso de "comprimir todo lo que entra a `public/`" como regla de CI.

### 26. Gaussian splatting en la web (Spark, SPZ, SOG)

- **Herramientas.** [Spark](https://github.com/sparkjsdev/spark) (World Labs) se integra con three.js, mezcla splats y mallas con orden correcto, apunta a más del 98 % de equipos con WebGL2 y dice que "renderiza rápido incluso en móviles de baja potencia". Lee PLY, SPZ, SPLAT, KSPLAT y SOG. [SPZ 4 (Niantic Spatial)](https://nianticspatial.com/blog/spz4) produce archivos **unas 10× más chicos que PLY**; un escaneo típico de celular tiene "unos cientos de miles de puntos". [SOG (PlayCanvas)](https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/) es entre 15 y 20× más chico que PLY y tiene streaming por LOD. [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) es otra opción.
- **Cuentas propias (estimación).** Un splat 3DGS con armónicos esféricos completos ocupa 62 floats, unos 248 B en PLY. Un edificio escaneado con 300 000 splats son ~74 MB en PLY y **~5–7 MB en SPZ/SOG**. Eso es un tercio o la mitad de nuestro presupuesto total **por edificio**. Además, los splats no tienen colisión, no se reiluminan con nuestro ciclo día/noche y en celulares el ordenamiento cuesta.
- **Lección.** Los splats sirven para **capturar referencia** (y para mirarla en el escritorio), **no para el mundo jugable**. A lo sumo cabe un único "momento postal" opcional y con carga diferida.

---

## Patrones transversales

1. **Datos automáticos para la masa, mano humana para la identidad.** Pasa en MSFS (autogen + POIs), Spider-Man (procedural + landmarks), BTE y Arnis (OSM + construcción manual) y Division 2 (catastro + world bible).
2. **Condensar es una decisión de diseño para lugares grandes**: GTA, Spider-Man, Watch Dogs, FH6. Los lugares chicos y queridos se hacen 1:1: Blockeley, Penn, Kamurocho, AC Unity en el núcleo.
3. **Las anclas perceptivas mandan**: Central Park en Spider-Man, Notre-Dame en AC Unity, el estadio en Blockeley. Si el ancla está bien, se perdonan errores alrededor.
4. **La gente local valida y aporta**: el consultor de FH6, la memoria de la banda en Blockeley, el llamado en Facebook, los equipos regionales de BTE.
5. **El dato abierto trae errores** (la torre de 212 pisos de MSFS) y **lo no mapeado no existe** (Arnis). Hace falta validación y una vía para corregir río arriba, en OSM.
6. **Vida y luz** pesan tanto como la geometría: el Census de Legion, los cielos de FH5 y el clima de 1986 en Shenmue.
7. **Lo legal importa**: Google prohíbe derivados, Blockeley cambió de nombre y Notre-Dame no es 100 % exacta por derechos.

---

## Lecciones para el Campus UAP

Están ordenadas por **impacto / costo** para el estado actual: Hito 4, ~9 MB sin comprimir, 44 edificios, 7 con apariencia por referencia y ningún hero asset todavía.

### P1 — Mantener escala 1:1 y "condensar la experiencia", no el mapa
Los edificios ocupan unos **590 × 556 m** (`data/world.json`, ~0,3 km² de núcleo construido). Es del tamaño de Kamurocho o Dobuita, no de Los Santos. Condensar rompería lo que más se juzga (el 70 % de los jugadores de MSFS fue primero a su casa) y desalinearía OSM, el IGN y el minimapa. Para "condensar":
- recortar la periferia vacía en `tools/build-world.ts` (márgenes de 100 m alrededor del perímetro);
- usar la bici y el recorrido guiado para acortar tiempos;
- concentrar el detalle en el **eje peatonal principal** (Pórtico → Templo → Biblioteca → Administración), como hace Kamurocho con su densidad.

### P2 — Elegir 4 anclas perceptivas como hero assets, y no más
Siguiendo el patrón Central Park / Notre-Dame / Memorial Stadium: **Pórtico (entrada), Templo, Biblioteca (Fernando Chaij) y Auditorio Mayor**. Ya figuran en `docs/STATUS.md` como objetivo de hero assets.
- **Presupuesto sugerido**: ≤ 600 KB por GLB (meshopt + KTX2 ETC1S/UASTC para las piezas cercanas), unos 2,5 MB en total.
- **Pipeline**: importar la huella con Blosm u OSM2World a Blender, modelar encima y exportar con el contrato de `specs/011-hero-assets.md` (origen en el centroide, Y=0, X=Este, −Z=Norte) a `public/models/hero/way-<id>.glb`.
- Agregar un test que compare el bbox del GLB con la huella OSM (± 0,5 m) para evitar el problema de alineación que tuvo Phoghorn.
- No intentar replicar al 100 % (AC Unity, Notre-Dame): con **silueta, proporción, color y la puerta principal** alcanza.

### P3 — Los otros 40 edificios: procedural + kit de *trim sheets* por familia arquitectónica
- Agrupar los edificios en 3–5 **familias** según lo que se ve en `reference/web/_summary.json`, por ejemplo: ladrillo visto, revoque blanco, hormigón o institucional moderno, galpón o taller.
- Para cada familia, una *trim sheet* de 2048² en KTX2 con bandas de zócalo, cornisa, dintel, marco de ventana, baranda y canaleta. Mapear las UV procedurales de `src/world/buildings` a esas bandas (la técnica de [Roblox – trim sheets](https://create.roblox.com/docs/tutorials/curriculums/environmental-art/develop-polished-assets) y [80.lv – trim sheets + decals](https://80.lv/articles/005cg-001agt-sanxia-street-1940-modular-approach-trim-sheets-decals)).
- La variedad sale de tinte por edificio (`appearance` en `world.json`) y de *decals* (cartel con nombre, número, aire acondicionado), no de texturas nuevas.
- Costo estimado: ~1–1,5 MB para todo el campus.

### P4 — Plan de fotos de referencia por edificio (shot list)
Va en `reference/photos/<osmKey>/`, nunca en el build (REF-3). Para **cada** uno de los 37 edificios listados en `data/missing-info.md`:

| # | Toma | Cómo | Para qué |
|---|---|---|---|
| 1 | Frontal ortogonal | Centrada en la puerta principal, cámara a 1,5 m, perpendicular a la fachada, a la distancia mínima en la que entra todo el frente | Proporciones, pisos, ubicación de la puerta (alimenta `entrance`) |
| 2–3 | Esquinas a 45° | Desde las dos esquinas del frente, que se vean dos fachadas y el techo | Forma de techo (`roof:shape`), volumetría |
| 4 | Laterales y contrafrente | Una por lado, aunque sea rápida | Que el procedural no invente |
| 5 | Detalle de material | 1 × 1 m de pared a ~1 m, perpendicular, **con tarjeta gris o algo de tamaño conocido** | Textura tileable, escala real del ladrillo |
| 6 | Puerta principal | Frontal, que se vea el umbral y una persona o el picaporte como escala | Hint "E", decal de puerta |
| 7 | Carteles y señalética | Frontal, legible | Decals de nombre (el gran disparador de "es acá") |
| 8 | Contexto | Desde 20–30 m, que se vean árboles, vereda y faroles vecinos | Vegetación y mobiliario |

- **Condiciones.** Día **nublado y luminoso**, o media mañana con el sol a las espaldas. Sin zoom digital. Exposición y balance de blancos **fijos** durante la serie. Anotar fecha y hora (sirve para P9).
- **Si se busca fotogrametría de un hero asset.** Hay que rodear el edificio con una foto cada **10–15°**, con **60–80 % de solape** entre fotos consecutivas, en dos alturas (1,5 m y, si se puede, desde un primer piso enfrente). Son unas 80–150 fotos por edificio. Se procesa con RealityCapture, Meshroom o COLMAP **solo como referencia de modelado**, porque la malla cruda no entra en el presupuesto. Las cifras de solape siguen las [mejores prácticas de Pix4D](https://support.pix4d.com/hc/best-practices-for-image-acquisition-and-photogrammetry): 75 % frontal y 60 % lateral como base, 85 % en escenas complejas, órbitas a 45° para edificios.
- **Datos estructurados.** Cada toma lleva su metadato en `refs.json`, como pide REF-1.

### P5 — Plan con dron si el dueño puede volar uno
- **Normativa.** Revisar la **Resolución ANAC 550/2025** y la Parte 101 de las RAAC antes de volar. Según la prensa, los equipos de **menos de 250 g** quedaron casi sin trámites y existe una "Categoría Abierta" con autorregistro, pero las fuentes no coinciden en lo del registro. [Boletín Oficial 08/08/2025](https://www.boletinoficial.gob.ar/detalleAviso/primera/329510/20250808) · [Argentina.gob.ar – autorregistro](https://www.argentina.gob.ar/noticias/se-implementa-el-nuevo-sistema-de-autorregistro-de-drones-0) · [La Gaceta](https://www.lagaceta.com.ar/nota/1128517/sociedad/normativa-drones-argentina-vuelo-libre-para-equipos-menos-250-gramos-sin-licencia-hasta-25-kilos.html)
  - Pedir **autorización escrita de la UAP**: el sobrevuelo de un campus con residencias estudiantiles y del sanatorio es sensible por privacidad.
  - Verificar si hay helipuertos o zonas restringidas cerca.
- **Misiones, en orden de valor:**
  1. **Grilla nadir** a 60–80 m AGL, con 75 % frontal y 60 % lateral → ortofoto actualizada (la del IGN es de 2013) + DSM. El DSM menos el DEM da **altura real de cada edificio**, que reemplaza los "2 niveles por defecto" de 38 edificios.
  2. **Órbitas a 45°** sobre los 4 hero assets → referencia de techos y fachadas altas que no se ven desde el piso.
  3. **Fotos de árboles** desde arriba → posición y diámetro de copa de los ejemplares notables (hoy OSM tiene 0 árboles).
- **Qué se publica.** El producto **no se publica como malla**. Se usa para medir y como referencia, y las alturas medidas se suben a OSM (P8).

### P6 — Validar datos abiertos con reglas de cordura (lección de la torre de 212 pisos de MSFS)
En `tools/build-world.ts` y `shared/world`:
- Rangos de `levels` y `height` por `kind`, con aviso en `data/missing-info.md` si se salen.
- Relación altura / huella máxima.
- Nombres duplicados: ya pasa con "Supermercado CEAPÉ" × 2.
- POIs sin edificio: el Sanatorio es un nodo.

Que el informe de faltantes sea la **lista de tareas para la comunidad**.

### P7 — Usar a la comunidad UAP como lo hizo Blockeley
- Hacer un **llamado público** (grupos de alumnos y egresados, Instagram institucional) con un **formulario** que pida por edificio fotos (con licencia CC BY o cesión), cantidad de pisos, tipo de techo, dónde está la puerta y una anécdota. Responder "¿qué pasó acá?" es la *world bible* de Division 2.
- Hacer una **sesión de validación** con 5–10 personas del campus que recorran el build y digan "esto no es así", al estilo del consultor local de FH6.
- **Legal.** Pedir a la universidad **permiso de uso de nombre, logo y fotos** (Blockeley cambió de nombre para evitar conflictos). REF-6 ya contempla las fotos institucionales; falta el permiso de marca.

### P8 — Arreglar río arriba, en OSM
Lo que no está mapeado no existe (Arnis), y Streets GL muestra que con buenos tags alcanza para un edificio creíble. Cargar en OSM, con fuentes propias y nunca con Google:
- `building:levels`, `roof:shape`, `roof:colour`, `building:colour`, `building:material`;
- los árboles notables con `natural=tree` (+ `species`);
- `entrance=main` en las puertas;
- los nombres que faltan (6 edificios sin `name`).

Así el pipeline (`npm run data`) mejora solo y la comunidad OSM local también gana. Hay que documentar en `CREDITS.md` que el aporte es propio.

### P9 — Hacer que "se lea" como el lugar: señales de reconocimiento
En orden de impacto por MB:
1. **Cartelería real**: nombres de edificios, el cartel del Pórtico, señalética de caminos. Se hacen como *decals* en un atlas chico; Kamurocho reproduce la cartelería casi exacta.
2. **Vegetación característica**: relevar las especies reales en el campus (la especie del arbolado de vereda, los ejemplares grandes) y ajustar las 3 especies procedurales de `src/world/vegetation` en forma, color de follaje y floración. Ubicar a mano los ~20 árboles notables en vez de esparcirlos al azar.
3. **Mobiliario urbano**: inventario fotográfico de bancos, faroles, cestos, bicicleteros y carteles de horarios. Tienen que ser **los modelos reales**, porque un farol genérico "suena" falso. Va en `src/world/props` con instancing.
4. **Color y luz**: calibrar el grading y la temperatura del cielo con fotos tomadas a horas conocidas (P4) y con la ortofoto IGN para los colores del suelo (tierra, pasto, ladrillo). FH5 capturó sus propios cielos: un time-lapse de cielo del lugar, aunque sea con celular, sirve de referencia para `?hour=`.
5. **Sonido** (barato en MB): campanas o el órgano del Templo, pájaros locales, bicicletas.

### P10 — Vida: estudiantes según la hora
Inspirado en el Census de Legion, pero mínimo: unos 20–40 NPC instanciados que vayan entre hogares, aulas, comedor y templo según `?hour=`, reutilizando el personaje CC0 con variaciones de ropa por shader, que ya existe. Princeton y USU muestran que lo que vuelve "vivo" un campus son las **actividades**, no la réplica.

### P11 — Gancho de juego basado en el reconocimiento
Copiar las fotos de landmarks de Spider-Man y el Journal de FH6:
- un **"álbum del campus"** que se completa fotografiando los puntos emblemáticos, ya resaltados como *tour targets* en el mapa (N);
- una búsqueda del tesoro como la de Princeton.

El panel de `buildings-info.json` aporta la historia de cada lugar.

### P12 — Splats vs. mallas: mallas para el mundo, splats solo para referencia
Por las cuentas del caso 26 (~5–7 MB por edificio en SPZ/SOG), sin colisión ni reiluminación, los splats **no van en el build**. Sí sirven para capturar referencia rápida con celular (Scaniverse, Polycam, Luma) y mirarla en SuperSplat o Spark mientras se modela. Si algún día se agrega un "modo postal", que sea con carga diferida, fuera de los 15 MB y opcional.

### P13 — Presupuesto de bytes con la mira en celulares
- Ejecutar primero la migración pendiente de Rapier compat → WASM separado (−2,5 MB, `docs/STATUS.md`). Ese margen paga los 4 hero assets.
- Hacer de `npm run check:size` una barrera de CI con sub-presupuestos: hero ≤ 2,5 MB, trim sheets ≤ 1,5 MB, props y decals ≤ 1 MB.
- En `low`: sin SSR/SSAO y con sombras de una cascada. Streets GL muestra que una cadena de post de escritorio exige GPU discreta.
- Medir en un celular de gama media real antes de sumar detalle (pendiente en STATUS).

### P14 — No usar Google en ninguna forma, tampoco "para mirar y calcar"
Las políticas de Map Tiles prohíben "trazar", "digitalizar" y "construir modelos 3D" a partir de su contenido, y derivar objetos "a mano o por máquina" de los 3D Tiles. Hay que extender la auditoría de `npm run data:collect-refs` para que los metadatos de cada hero asset declaren sus fuentes (fotos propias, dron, OSM, IGN) y dejarlo escrito en `specs/012-references.md`.

### P15 — Fase 2 opcional: modo histórico
Siguiendo a Blockeley 1893 y a Mafia III con su archivo: con fotos de archivo de la UAP (el Colegio Adventista del Plata de principios del siglo XX), un **modo "campus 19XX"** que reutilice el terreno y reemplace edificios. Es contenido de alto valor emocional para egresados y de bajo costo técnico, porque usa el mismo pipeline de hero assets.

---

### Fuentes consultadas que no se pudieron abrir directamente
80.lv, techcrunch.com, destructoid.com, medium.com y conecta.tec.mx bloquearon la descarga desde este entorno. Sus datos vienen de resúmenes del buscador y están marcados *(secundaria)*. Conviene verificarlos antes de citarlos externamente.
