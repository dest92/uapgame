# Roadmap técnico — Campus UAP 3D (realismo + rendimiento)

> Investigación de noviembre 2026 para el POC (`three@0.187` `WebGPURenderer` + TSL, Rapier compat 0.21, Vite 8, TS strict,
> despliegue como Artifact de claude.ai con binarios en base64, objetivo iPhone Safari, < 15 MB de carga inicial).
> Las afirmaciones marcadas **[r187 local]** se verificaron leyendo `node_modules/three` de este repo; el resto cita fuentes.
> Ningún número de rendimiento de este documento se midió en GPU real (el entorno de CI no tiene GPU; ver `docs/STATUS.md`):
> las ganancias son **estimaciones** que el ítem 1 del roadmap tiene que confirmar.

## 0. Punto de partida (lo que hay hoy en el código)

| Área | Estado actual | Archivo |
|---|---|---|
| Edificios | 44 volúmenes extruidos; se fusionan **por material en una sola malla para todo el campus** (sin culling útil); 41/44 con techo plano porque OSM no tiene `roof:shape`; techos a dos aguas solo si `rectangularity ≥ 0.78` (OBB) | `src/world/buildings/BuildingGeometryBuilder.ts`, `BuildingsBuilder.ts` |
| Fachadas | Ventanas **pintadas en el shader** (grilla `BAY=3.3 m`, `LEVEL=3.2 m`) con "reveal" falso; foto real como quad pegado a la pared de la entrada en 3 edificios | `src/render/materials/nodes/facadeNode.ts`, `photoFacade.ts` |
| Árboles | `InstancedMesh` por especie y parte, 2 LOD repartidos en CPU cada 0,35 s, `frustumCulled = false`, **todos `castShadow`** | `src/world/vegetation/TreeSystem.ts` |
| Pasto | 1 draw call, hasta 120 000 matas, toroide que sigue a la cámara, altura desde textura | `GrassField.ts` |
| Sombras | CSM (`CSMShadowNode`) de 3 cascadas × 2048² (medio) / 4 × 4096² (alto); 1 mapa que sigue al jugador en bajo | `src/render/sky/SkySystem.ts`, `src/domain/quality/QualityProfiles.ts` |
| Post | `RenderPipeline` con GTAO a ½ res, bloom, grading manual y viñeta; AA = MSAA del canvas | `src/render/post/PostPipeline.ts` |
| Texturas | 10 sets ambientCG en KTX2 **ETC1S para todo (incluidas normales)**, 512–1024 px | `tools/lib/assets/ktx2.ts`, `TextureLibrary.ts` |
| Suelo | Splat RGB pintado en canvas desde áreas OSM; terreno IGN MDT 30 m suavizado | `GroundPainter.ts`, `TerrainMeshBuilder.ts` |
| Calles | Tiras por polilínea con cordón; los cruces se "resuelven" saltando cordones (`CoveredTest`) | `RoadGeometryBuilder.ts` |
| Física | `@dimforge/rapier3d-compat` (~4,3 MB de JS con el WASM en base64) | `src/physics/RapierPhysicsWorld.ts` |
| Mundo | ~907 × 822 m (bounds de `world.json`), 170 caminos, 38 áreas | `data/world.json` |

Conclusión: el campus es **chico** (menos de 1 km²). El cuello de botella no va a ser la cantidad de draw calls (hay decenas, no miles) sino
**(a) el costo de sombras** (todo el campus y todos los árboles se dibujan en cada cascada), **(b) el fill-rate en mobile** (DPR, post, pasto, follaje con alpha) y
**(c) el realismo a corta distancia** (ventanas planas, techos planos, cruces de calles). El roadmap se ordena según eso.

---

## 1. Rendimiento de render en three.js WebGPU / WebGL2 (2025-2026)

### 1.1 Reducción de draw calls

- **`InstancedMesh`**: lo correcto para muchas copias de la misma geometría (árboles, bancos, faroles). Limitación: un solo bounding sphere para todas las instancias, así que el culling es todo o nada. Con `frustumCulled = false` (como hoy en `TreeSystem`) **también se dibuja entero en cada cascada de sombra**.
- **`BatchedMesh`**: varias geometrías **distintas** con el mismo material en un draw call (multi-draw), con culling y orden **por instancia** (`perObjectFrustumCulled`, activo por defecto). Un contribuidor midió ~1,5 ms/frame de CPU recorriendo 20 000 ítems para el culling, y el test usa esferas, no OBBs ([PR #28404](https://fr.github.com/mrdoob/three.js/pull/28404), [docs BatchedMesh](https://threejs.org/docs/api/en/objects/BatchedMesh.html), [demo Codrops BatchedMesh + WebGPURenderer](https://tympanus.net/codrops/2024/10/30/interactive-3d-with-three-js-batchedmesh-and-webgpurenderer/)). Para el campus conviene usarlo con el **mobiliario heterogéneo** (bancos, cestos, bolardos, bicicleteros, carteles, faroles) y con **edificios por celda** si se quiere culling sin multiplicar materiales.
- **Extensiones**: `@three.ez/batched-mesh-extensions` (BVH TLAS/BLAS para culling y raycast, LOD por instancia; trae una build `webgpu.js`, [repo](https://github.com/agargaro/batched-mesh-extensions/), [ejemplo oficial](https://threejs.org/examples/webgl_batch_lod_bvh.html)) e `@three.ez/instanced-mesh` (`InstancedMesh2`: BVH, culling por instancia y LOD; [hilo](https://discourse.threejs.org/t/three-ez-instancedmesh2-enhanced-instancedmesh-with-frustum-culling-fast-raycasting-bvh-sorting-visibility-management-lod-skinning-and-more/69344)). No encontré una declaración explícita de soporte WebGPU para `InstancedMesh2`: hay que validarlo antes de adoptarlo. Para este tamaño de mundo, un **culling por celdas de 64–128 m hecho a mano** alcanza y no agrega dependencias.
- **Merge** (lo que hace hoy `BuildingsBuilder`): mínimo de draw calls, pero sin culling (ni en cámara ni en sombras) y con re-subida total si algo cambia. Recomendación: **fusionar por celda** (p. ej. 128 m → unas 50 celdas) y por material; así se conserva el bajo número de draws y se recupera el culling por cascada.
- **Costo CPU por draw en `WebGPURenderer`**: hay reportes de ~2× más CPU por draw que `WebGLRenderer` (manejo de uniform buffers, [hilo](https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904)) y una regresión en r182 que los mantenedores corrigieron en r183 ([hilo](https://discourse.threejs.org/t/webgpu-significant-performance-drop-and-shadow-quality-regression-in-r182-vs-webgl-r170/89322)). Otra razón para tener pocos objetos.

### 1.2 LOD y HLOD

- **LOD por objeto**: en follaje y props el LOD que se nota es la **cantidad de píxeles con alpha-test**, no los triángulos. Hoy los árboles tienen 2 LOD de malla; falta un **LOD 2 = impostor** (1.3).
- **HLOD** (agrupar edificios lejanos en un proxy con textura horneada): en un mundo de menos de 1 km² con niebla suave el beneficio es bajo. Lo barato y útil: un **LOD de fachada** (sin geometría de ventanas, solo shader) a más de unos 120 m, y la **geometría real de ventanas solo cerca** (ítem 4 del roadmap).
- **Simplificación**: `meshoptimizer` ya está en devDependencies (`simplify`, `simplifyWithAttributes`): úsenlo en los tools para generar LODs de hero assets y escaneos.

### 1.3 Impostores (árboles y edificios lejanos)

- **Octahedral impostors**: se capturan N×N vistas del objeto en un atlas (color + normal + profundidad) y se reconstruye en un quad mezclando las 3 vistas más cercanas. Referencias en three.js: la librería de Andrea Gargaro (demo de 200 000 árboles con `InstancedMesh2` + BVH, LOD malla→simplificada→impostor a más de 100 m; el autor dice que todavía no está lista para producción, [hilo](https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735), [hilo previo](https://discourse.threejs.org/t/octahedral-impostors-for-three-js/80318)), [Ctrlmonster/three-octahedral-impostor](https://relatedrepos.com/gh/Ctrlmonster/three-octahedral-impostor) y el [port de Godot](https://github.com/SIsilicon/Godot-Octahedral-Impostors) como referencia de algoritmo.
- **Para este repo**: hornear el atlas **en runtime al cargar** (renderizar 8×8 vistas de 128 px de cada especie a un `RenderTarget`, que lleva unos pocos ms) evita sumar MB al presupuesto y funciona en los dos backends. El impostor también puede **proyectar sombra** (un quad orientado al sol con alpha), lo que baja mucho el costo de los árboles en las cascadas lejanas.
- **Edificios lejanos**: no hacen falta impostores; alcanza con el LOD de fachada sin geometría.

### 1.4 Culling

- **Frustum**: por celda (ver 1.1). Hoy `TreeSystem` ya hace un culling por distancia (650 m), pero no por frustum.
- **Oclusión**: three.js no trae occlusion culling general. Hay occlusion queries en `WebGPURenderer` (`object.occlusionTest` + `renderer.isOccluded()`, con un frame de latencia), pero con un campus abierto y edificios bajos la ganancia es marginal. **No se recomienda** fuera de interiores.
- **Culling de sombras**: es el más rentable. Asegurarse de que cada cascada descarte lo que no toca (requiere objetos con bounds reales, no `frustumCulled = false`) y de que el follaje lejano no proyecte sombra.

### 1.5 GPU-driven con compute (solo WebGPU)

- three r18x soporta **draw indirecto** (`BufferGeometry.setIndirect`, `IndirectStorageBufferAttribute`) y compute con TSL (`instancedArray`, `storage`, `renderer.compute`) **[r187 local]**. Patrón: un compute por frame hace culling por frustum y distancia de las instancias de pasto y árboles, escribe en un buffer compacto y actualiza `instanceCount` del draw indirecto.
- **En este repo**: el pasto ya es "GPU-driven" a su manera (toroide + textura de altura). El compute solo conviene si se pasa a cientos de miles de instancias de follaje **y** el backend es WebGPU. Como el Artifact usa WebGL2 por defecto (iOS), **toda ruta compute necesita un fallback CPU**. Prioridad baja.

### 1.6 Sombras

- **Costo**: cada cascada vuelve a dibujar los casters. Memoria con depth de 32 bits: alto = 4 × 4096² × 4 B ≈ **256 MB de VRAM**; medio = 3 × 2048² × 4 B ≈ 48 MB. En iPhone, el perfil alto es inviable. Un benchmark de terceros mide `CSMShadowNode` 3×2048² en unos +3 ms respecto de sin sombras en desktop ([Sundial](https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912); datos autoinformados).
- **Opciones en r187 [r187 local]**:
  - `CSMShadowNode` (`examples/jsm/csm`), el que se usa hoy. Solo funciona con `WebGPURenderer` (con cualquiera de sus dos backends) ([docs](https://threejs.org/docs/pages/CSMShadowNode.html)).
  - `SunLight` + `SunLightShadow` (`examples/jsm/lights`): CSM de **2 cascadas** ajustadas automáticamente al frustum, 1024² por defecto, pensado para escenas grandes. Requiere `SunLight.registerNode(SunLightNode)`. Un usuario lo reporta más rápido que CSM, aunque menos nítido ([hilo](https://discourse.threejs.org/t/cascaded-shadow-maps-csm-on-webgpu/84235)).
  - `TileShadowNode` (`examples/jsm/tsl/shadows`): divide un mapa en tiles con su propia cámara. No soporta VSM.
  - **Caché estática**: `LightShadow.autoUpdate = false` + `shadow.needsUpdate = true` solo cuando cambia la hora. `ShadowNode` lo respeta (`needsUpdate || autoUpdate`) **[r187 local]**. Con un ortográfico que cubra todo el campus (~900 m → 4096² ≈ 22 cm/texel), la sombra lejana se vuelve gratis mientras el sol no se mueva.
- **Estrategia propuesta para el campus** (hora del día dinámica, mundo estático):
  1. **Bajo/mobile**: un único mapa **estático** de todo el campus (2048² o 4096²) re-renderizado solo al cambiar la hora más de unos 0,1 h; personajes, NPCs y bicicleta con **sombra de contacto/blob** (decal) en vez de sombra real.
  2. **Medio**: `SunLight` (2 cascadas × 2048²) con distancia de 120–160 m, y fuera de eso el mapa estático (o el AO horneado).
  3. **Alto**: CSM de 3 cascadas × 2048² (no 4096²).
  4. Árboles: proyectan sombra solo con LOD 0 en la primera cascada; impostor-sombra en el resto.
  5. Follaje con alpha: para que la sombra respete el recorte hace falta `alphaTest` o `maskShadowNode`/`castShadowNode` en el `NodeMaterial` **[r187 local]**.
- **Lightmaps y AO horneados**: r187 trae `LightMapper` (hornea irradiancia indirecta a `uv1` desde un `LightProbeGrid` o VXGI; solo WebGPU) y `unwrapUVs` (atlas de lightmap) **[r187 local]**. Como la luz del sol cambia con la hora, **no conviene hornear la luz directa**; sí conviene hornear la **visibilidad del cielo (AO)** del terreno y la base de los edificios, que no depende de la hora. Se puede hacer en los tools con CPU (raycast contra el heightfield y los footprints) y guardar un KTX2 de una sola capa. Así se evita depender de WebGPU en el momento de hornear.

### 1.7 Texturas

- **ETC1S vs UASTC**: ETC1S es chico pero **maneja mal las normales tangentes**; UASTC es de mayor calidad (unos 8 bpp antes de Zstd) y es lo recomendado para normales y mapas empaquetados (ORM). La guía de Khronos usa ETC1S para base color/emisivo y UASTC para normal/ORM ([KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md), [Don McCurdy, formatos de textura web](https://www.donmccurdy.com/2024/02/11/web-texture-formats/), [Khronos](https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets)). Si se mantiene ETC1S para normales: separar X→RGB e Y→A (`-separate_rg_to_color_alpha`). Hoy `tools/lib/assets/ktx2.ts` usa ETC1S para todo: **pasar las normales de 512 px a UASTC + RDO + Zstd** cuesta poco en bytes y elimina los bloques visibles.
- **Basis Universal 2.x** agregó **XUASTC LDR** (todos los tamaños de bloque ASTC, de 4×4 a 12×12, con ~0,3–5,7 bpp) ([README v2.0](https://skia.googlesource.com/external/github.com/BinomialLLC/basis_universal/+/refs/tags/v2_0)). Antes de usarlo hay que confirmar que el transcoder que incluye `KTX2Loader` en r187 lo soporte.
- **Atlas, texture arrays y trim sheets**: `CompressedArrayTexture` acepta KTX2 de varias capas (mipmaps embebidos) y anda en WebGPU ([ejemplo `webgpu_textures_2d-array`](https://discourse.threejs.org/t/how-to-use-array-uniform-of-texture-in-webgpu-version/69249)). Para el suelo (pasto/tierra/pavimento/asfalto) **un array de 4 capas** reduce samplers y permite agregar capas sin cambiar el shader. Para fachadas: **trim sheet** (sección 4).
- **Virtual texturing**: WebGPU no tiene sparse textures (es una propuesta, [gpuweb#455](https://github.com/gpuweb/gpuweb/issues/455)). Las implementaciones emuladas necesitan un feedback buffer y lectura a CPU ([hilo three.js](https://discourse.threejs.org/t/virtual-textures/53353), [tesis Chalmers](https://www.cse.chalmers.se/~uffe/xjobb/Virtual_Texturing_with_WebGL.pdf)). **No es viable ni necesario** para el campus con presupuesto de 15 MB. Para la ortofoto alcanza con una textura de 2048–4096 px.

### 1.8 Hitches de compilación de shaders

- Ya se llama a `renderer.compileAsync(scene, camera)` en `bootstrap.ts`. Faltan tres cosas:
  1. **Precompilar las variantes de calidad**: al cambiar a "alto" aparecen materiales/pasadas nuevos (AO, CSM con otra cantidad de cascadas). Recompilar con `compileAsync` **antes** de cambiar el `presenter` y mostrar un "aplicando…".
  2. **Objetos que aparecen después** (hero GLB, NPCs, bici): agregarlos ocultos a la escena antes del `compileAsync` inicial, o compilarlos al cargarlos con `compileAsync(obj, camera, scene)` (el tercer parámetro hace que coincidan los nodos de luces, **[r187 local]**, `Renderer.js` 1019).
  3. **Texturas**: `renderer.initTexture(t)` para subirlas antes del primer frame (en r181 se deprecó `initTextureAsync`).
- Mantener **pocas permutaciones**: día/noche ya son uniforms (`sceneUniforms.night`). Evitar `material.needsUpdate` y defines por edificio.

### 1.9 Mobile e iOS

- **WebGPU en iOS 26**: viene activado por defecto en Safari 26 ([estado de implementación](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status), [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)), pero hay bugs abiertos que reproducen en 26.x: Construct planeaba desactivarlo en iOS ([WebKit 301627](https://bugs.webkit.org/show_bug.cgi?id=301627)), y en este repo la escena salía **en blanco** (commit `39ab1f1`). Un dev reporta que con r184 sus demos WebGPU andan en iPhone y la WebGL2 no ([hilo](https://discourse.threejs.org/t/r184-and-i-phone/91051)). **Recomendación**: mantener WebGL2 por defecto en iOS (y en el Artifact) con `#webgpu` como opt-in, y volver a evaluar en cada release de three/iOS con la prueba E2E en un dispositivo real.
- **Memoria**: iOS Safari mata pestañas por presión de memoria con un límite que no es la RAM física; hay casos de **reload loop** con páginas WebGL cargadas de texturas ([WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782), [Apple forums](https://developer.apple.com/forums/thread/741624)). Un presupuesto prudente para iPhone es **≤ 300–400 MB** de proceso. Las sombras de 4096² y los render targets a DPR 3 son lo primero que se va.
- **Contexto perdido**: varios reportes se resolvieron con `powerPreference: 'default'` y `antialias: false` ([hilo iOS 17.5](https://discourse.threejs.org/t/texture-is-causing-loss-of-context-in-ipados-ios-17-5-1-when-using-react-three-fiber/68643), [iOS 18.2](https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143)). `RendererFactory.ts` pide `high-performance` siempre: usar `default` en mobile y manejar `webglcontextlost`.
- **DPR**: el perfil bajo ya usa `pixelRatioCap = 1` y `renderScale = 0.75`. En iPhone (DPR 3) es lo correcto. Con WebGPU, `TAAUNode` o `FSR1Node` (r187) permiten renderizar al 60–70 % y reconstruir **[r187 local]**.
- **Térmica**: los fps caen después de 2–5 minutos. Hace falta una **calidad adaptativa** (bajar `renderScale` si el p95 del frame supera 20 ms durante N segundos) en `QualityManager`.

### 1.10 Medición

- **CPU/draws**: `renderer.info.render.drawCalls/triangles` (ya está en F3). Agregar `info.memory.geometries/textures` y contadores por pasada (sombra, principal, post).
- **GPU**: `new WebGPURenderer({ trackTimestamp: true })` + `await renderer.resolveTimestampsAsync('render' | 'compute')` **cada frame**: si no se resuelven, el pool de queries se llena ([hilo r173](https://discourse.threejs.org/t/r173-resolve-timestamps-error-message/77370), [WebGPUTimestampQueryPool](https://threejs.org/docs/pages/WebGPUTimestampQueryPool.html)). Safari no expone `timestamp-query` ([WebKit 282356](https://bugs.webkit.org/show_bug.cgi?id=282356)). [`stats-gl`](https://cdn.jsdelivr.net/npm/stats-gl@4.2.3/README.md) muestra GPU/CPT con esa misma API.
- **Inspector de three** (`examples/jsm/inspector`, r18x) **[r187 local]**: panel con timings y árbol de nodos, útil en dev.
- **WebGL2**: Spector.js (captura de frame, estados, draws). Safari Web Inspector → pestaña Graphics en iOS por cable.
- **E2E**: el smoke de Playwright corre en SwiftShader: sirve para regresiones visuales, **no** para rendimiento. Falta una corrida manual con una planilla fija (laptop con iGPU + iPhone 12/13 + un Android de gama media) en 3 puntos de cámara fijos.

### 1.11 Trampas conocidas de three r16x–r18x (WebGPU/TSL)

| Trampa | Detalle | Fuente |
|---|---|---|
| `light.shadow.shadowNode = null` | Rompe el shader (geometría "estirada"). Para volver a la sombra estándar hay que **borrar** la propiedad (`undefined`), como hace `SkySystem.setQuality` | commit `2dbd8c1` de este repo |
| APIs `*Async` | Desde r181, `renderAsync`, `hasFeatureAsync`, `initTextureAsync` y `PMREMGenerator.from*Async` están deprecadas: `await renderer.init()` una vez y usar las versiones síncronas | **[r187 local]** `Renderer.js` 1482/3361/3418 |
| `compute()` antes de `init()` | Advertencia en r179; usar `computeAsync` o esperar a `init()` | [hilo](https://discourse.threejs.org/t/r179-now-processes-webgpu-compute-dispatchsize-parameter/85827) |
| `PostProcessing` → `RenderPipeline` | Renombrado en r183 (el repo ya usa `RenderPipeline`) | [blog](https://blog.gitcode.com/6a8dd7548cd00734b13c831fa4d3944b.html) |
| `NodeLibrary.addLight()` | Deprecado en r187: `Light.registerNode()` (necesario para `SunLight`) | **[r187 local]** `NodeLibrary.js` 141 |
| TRAA/TAAU | Exigen **MSAA desactivado** y un MRT de velocidad | [TRAANode](https://threejs.org/docs/pages/TRAANode.html) |
| SMAA / FXAA | SMAA va **antes** de la conversión a sRGB; FXAA necesita entrada sRGB, así que hay que desactivar `outputColorTransform` y aplicar `renderOutput()` a mano | [SMAANode](https://threejs.org/docs/pages/SMAANode.html), [FXAANode](https://threejs.org/docs/pages/FXAANode.html), [manual](https://threejs.org/manual/en/webgpu-postprocessing) |
| `SSRNode.environmentNode` | Necesita un equirectangular con `image.data` en CPU; **no** sirve con PMREM ni `scene.environment` | **[r187 local]** `SSRNode.js` 23 |
| `timestamp-query` | Sin `resolveTimestampsAsync` por frame el pool se agota | [hilo r173](https://discourse.threejs.org/t/r173-resolve-timestamps-error-message/77370) |
| CSM + metalness | Se reportaron GLTF metálicos negros con CSM | [hilo](https://discourse.threejs.org/t/csm-makes-any-gltf-assets-with-metalness-black/94231) |
| `InstancedMesh.frustumCulled = false` | Se dibuja completo en **cada cascada**; calcular `computeBoundingSphere()` del conjunto o hacer culling por celda | código actual de `TreeSystem` |
| Primer frame en WebGPU | 5–10× más lento que WebGL en escenas con muchos meshes (compilación de pipelines): `compileAsync` antes de mostrar | [hilo](https://discourse.threejs.org/t/webgpurenderer-2x-slower-cpu-and-5-10x-slower-first-frame-than-webglrenderer-on-many-mesh-scenes-r183-same-on-both-backends/91904) |
| `@types/three` | Desde r184 ya no depende de `@webgpu/types` (TS 6 los trae) | [Sensei Notes](https://buttondown.com/wawasensei/archive/sensei-notes-09-a-racing-game-an-infinite-world) |

---

## 2. Generación procedural de campus/ciudad desde OSM

### 2.1 Gramáticas de edificios

- **CGA / split grammars**: Müller, Wonka et al., *Procedural Modeling of Buildings* (SIGGRAPH 2006): reglas de *split* (incluido el repeat split), *component split* (volumen → caras → aristas) y reglas sensibles al contexto (oclusión entre volúmenes) ([paper](https://course.khoury.northeastern.edu/cs5150f14/readings/muller_buildings.pdf), [SIGGRAPH history](https://history.siggraph.org/?p=113547)). La base es Wonka et al. 2003 (*Instant Architecture*). Tesis de Lipp sobre CGA ([PDF](https://www.cg.tuwien.ac.at/research/publications/2007/LIPP-2007-CGA/LIPP-2007-CGA-Thesis.pdf)). Hay modelado inverso de layouts de fachada a partir de fotos ([arXiv 1308.0419](https://arxiv.org/pdf/1308.0419), [FaçAID](https://arxiv.org/html/2406.01829v2)).
- **Cómo aplicarlo acá, sin un intérprete CGA**: un **mini-DSL en TypeScript puro** (sin Three, en `shared/` o `domain/`, para que se pueda testear con Vitest y respete las reglas de capas de ESLint):
  ```
  Building  → comp(faces){ side: Facade | top: Roof }
  Facade    → split(y){ Plinth 0.9 | Floor* | Cornice 0.4 }        // repeat por building:levels
  Floor     → split(x){ Pier ~0.5 | (Bay ~3.3)* | Pier ~0.5 }       // ajuste "~" al largo real
  Bay       → split(x){ Wall | Window(1.5×1.5, recess 0.18) | Wall }
  GroundBay → si contiene la entrada OSM: Door(1.8×2.4, canopy) ; si no: Bay
  ```
  La salida es una lista de **rectángulos con semántica** (muro, vano, marco, alféizar, puerta, cornisa) por cara. El builder de geometría (capa `world`) la convierte en quads con recesos reales y UVs a la trim sheet. Los parámetros salen de `buildings-info.json`/referencias (ritmo de vanos, color, material, cantidad de pisos), con defaults por tipo de edificio.
- **LOD**: el mismo resultado de la gramática alimenta (a) la geometría con recesos para la distancia menor a 120 m y (b) el shader de ventanas actual (`facadeNode.ts`) para la distancia mayor. Así cerca y lejos coinciden.

### 2.2 Techos: straight skeleton

- El **straight skeleton** del footprint da, para cualquier polígono (incluidos con agujeros), las caras de un techo **a cuatro aguas** (hipped). Los techos **a dos aguas** se obtienen subiendo los vértices de los extremos del skeleton hasta la fachada (gables) o con un skeleton **pesado** (peso 0 en las aristas hastiales). Bibliografía: [Wikipedia](https://en.wikipedia.org/wiki/Straight_skeleton), Held & Palfrader (aplicación a techos, [proyecto](https://www.cosy.sbg.ac.at/~held/projects/roofs/roofs.html)), modelado de techos intuitivo ([arXiv 2109.07683](https://arxiv.org/pdf/2109.07683.pdf)).
- **Librerías**:
  - [`straight-skeleton`](https://github.com/StrandedKitty/straight-skeleton) (MIT, v3.0.0): wrapper TS del straight skeleton de **CGAL compilado a WASM**. Acepta anillos o GeoJSON y soporta agujeros. La v1 es TS puro, más rápida y menos robusta. Su `dist/index.js` pesa ~1 MB, por eso conviene **usarlo en los tools (Node) y no en runtime**. Es del mismo autor que Streets GL.
  - [`weighted-straight-skeleton`](https://gh.r-mj.com/pcace/weighted-straight-skeleton): fork con pesos/ángulos por arista (pendientes distintas, hastiales).
  - [`bpypolyskel`](https://github.com/prochitecture/bpypolyskel) (Python, Blosm): el autor lo probó con las ~320 000 cubiertas a cuatro aguas de OSM con un 99,99 % de éxito. Sirve de referencia de casos borde.
- **Integración propuesta**: `tools/build-world.ts` calcula el skeleton y escribe en `world.json` las **caras del techo** (polígonos 3D relativos a la cumbrera) por edificio, y `BuildingGeometryBuilder` solo triangula. El costo en runtime es cero y se puede testear (área proyectada del techo = área del footprint; todas las normales con +Y). Formas de `roof:shape` del esquema [Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/OSM2World): `flat`, `gabled`, `hipped`, `pyramidal`, `skillion`, `half-hipped`, `mansard`, `dome`. **Dato faltante**: 41/44 edificios no tienen `roof:shape`; hay que completarlo en OSM o con un override en `reference/` (ya figura en "Datos que mejorarían el realismo" de STATUS).

### 2.3 Herramientas OSM 3D de las que aprender

| Herramienta | Qué mirar | Fuente |
|---|---|---|
| **OSM2World** (Java) | Catálogo completo de `roof:shape`, ventanas solo si hay `building:levels` (y `window=yes/no`), mobiliario urbano, exporta glTF/3D Tiles. Charla en FOSDEM 2026 | [wiki](https://wiki.openstreetmap.org/wiki/OSM2World), [FOSDEM 2026](https://fosdem.org/2026/schedule/event/osm2world_3d_rendering_openstreetmap_data), [docs](https://docsearch.algolia.com/mcp/docs/repo/tordanik/osm2world) |
| **Streets GL** (TS/WebGL2) | Generación de geometría en runtime en workers, techos por skeleton, `building:part`, árboles instanciados, render diferido | [hilo OSM](https://community.openstreetmap.org/t/streets-gl-a-new-3d-renderer-for-osm/98594) |
| **Blosm** (Blender) | Estilos de fachada declarativos, ventanas iluminadas por porcentaje, terreno; útil para **prototipar hero assets** sobre el footprint real | [repo](https://github.com/vvoovv/blosm), [docs](https://github.com/vvoovv/blosm/wiki/Documentation) |
| **OSM Buildings / vts** | Extrusión simple y tiling | — |

### 2.4 Red vial, cruces, veredas y cordones

- Problema actual: cada `way` es una tira independiente; los cruces se tapan saltando cordones y "levantando" calles sobre senderos (`LIFT`), lo que deja z-fighting, cordones cortados en diagonal y ninguna vereda real.
- **Enfoque robusto (offline, en tools)**:
  1. Construir el **grafo** (nodos compartidos entre ways = cruces).
  2. Por clase, hacer *offset* de cada eje a ±ancho/2 y **unir** los polígonos con Clipper2 → un polígono por superficie (calzada, vereda, sendero) sin solapes. Para sacar los senderos de debajo de las calzadas: `difference` de senderos − calzadas. Librerías: [`clipper2-ts`](https://cdn.jsdelivr.net/npm/clipper2-ts@2.0.1-17/README.md) (TS puro, BSL-1.0, con triangulación CDT), [`clipper2-wasm`](https://cdn.jsdelivr.net/npm/clipper2-wasm@0.2.1/README.md); ya existe `shared/geo/clip.ts` para extenderlo ([doc Clipper2](https://angusj.com/clipper2/Docs/Overview.htm)).
  3. **Cordón** = borde del polígono unido de calzada (ya no por polilínea), con extrusión de 15 cm. **Vereda** = offset exterior de 1,5–2,5 m menos edificios y calzadas. **Ochavas** con radio de giro: offset negativo y luego positivo (opening) con `JoinType.Round`.
  4. **Senda peatonal (paso de cebra)** donde un `footway` cruza una calzada: decal de franjas orientado al eje.
  5. Triangular (CDT) y **drapear** sobre el terreno: muestrear la altura en los vértices y subdividir aristas largas (cada ≤ 2 m) para que sigan el MDT. Sumar un *polygon offset* chico en el material en vez de levantar 9 cm.
- Salida: `data/roads.bin` (o un campo en `world.json`) con mallas listas. El runtime solo crea `BufferGeometry` (es más rápido y testeable).

### 2.5 Terreno

- El MDT IGN de 30 m suavizado (σ = 20 m) está bien a escala del campus, pero **aplana** taludes, cunetas y terraplenes. Mejoras: (a) **aplanar el terreno bajo edificios y calzadas** (*conforming*: bajar o subir el heightfield a la cota de la plataforma con una rampa de 3–5 m), así se elimina el zócalo de 1,5 m (`FOUNDATION`) en pendientes; (b) cunetas de 30 cm a los lados de las calles rurales; (c) si se hace un vuelo con drone (sección 3), reemplazar por un **DSM/DTM de 10–20 cm** del propio campus.

### 2.6 Mobiliario urbano (reglas de colocación)

- OSM tiene tags para todo (`amenity=bench`, `amenity=waste_basket`, `highway=street_lamp`, `amenity=bicycle_parking`, `barrier=bollard`; ver [wiki Street furniture](https://wiki.openstreetmap.org/wiki/Street_furniture)). Primero se usa lo mapeado; si no hay nada, se aplican **reglas** (hoy `domain/props/placement.ts` hace bancos cada 45 m).
- Reglas de referencia (guía peatonal de NZTA, [PDF](https://nzta.govt.nz/assets/Walking-Cycling-and-Public-Transport/docs/pedestrian-network-guidance/typical-characteristics-of-street-furniture.pdf)): postes a 0,75 m del cordón o centrados en la franja de mobiliario si mide más de 1,5 m; cestos **no** pegados a los bancos; faroles cada 25–35 m alternados en calles y cada 15–20 m en senderos principales; bicicleteros junto a las entradas (ya se calculan en `shared/world/entrance.ts`); bolardos donde un sendero entra a la calzada; carteles con el nombre del edificio frente a la entrada.
- Todo esto es dominio puro (testeable) → `BatchedMesh` de props en el render.

### 2.7 Vegetación

- OSM no tiene árboles en el campus (STATUS). Mientras tanto: **Poisson-disk** con densidad por tipo de área y exclusión por distancia a calzadas, edificios y redes; **alineaciones** sobre veredas (ya existe), **bosquetes** con ruido de baja frecuencia y **especies por zona** (jacarandá en avenidas, eucaliptos y casuarinas en bordes rurales, palmeras en plazas: validar con fotos).
- A mediano plazo: mapear los ejemplares notables como `natural=tree` (con `species`, `height`, `diameter_crown`) a partir de la ortofoto o el vuelo.

---

## 3. Modelado de edificios reales a partir de fotos

| Método | Calidad para edificios | Costo | Encaje con este juego |
|---|---|---|---|
| **fSpy + Blender** (camera matching con 1 foto por fachada) | Alta en volúmenes ortogonales, con control total de topología; texturas rectificadas | 2–6 h por edificio | **Recomendado** para los 11 edificios sin referencias y para el LOD de los hero |
| **Fotogrametría** (RealityScan 2.x, Meshroom/AliceVision, COLMAP/GLOMAP) | Muy alta en piedra y ladrillo; mala en vidrio, superficies lisas blancas y techos (no se ven desde el suelo) | 200–600 fotos + 2–4 h de limpieza/retopo | Hero assets (Templo, Pórtico); hace falta **drone** para los techos |
| **3D Gaussian Splatting** | Fotorrealista con la luz **del día de la captura** | 5–30 MB por edificio | Solo como "modo foto" opcional (ver 3.3) |
| **Imagen → 3D con IA** (TRELLIS 2, Hunyuan3D 2.5, SAM 3D) | Bueno para objetos aislados; aristas blandas y fachadas inventadas en edificios | minutos | Props y mobiliario, no edificios |
| **Profundidad monocular** (Depth Anything V2, Metric3D v2) | Escala que deriva, falla en vidrio | segundos | Ayuda para estimar profundidades de recesos o salientes en una foto, no para reconstruir |

### 3.1 Fotogrametría

- **RealityScan 2.x** (Epic, ex RealityCapture): gratis para individuos, educación y empresas con menos de USD 1 M/año de facturación, necesita GPU NVIDIA (CUDA). La 2.0 agregó enmascarado por IA y alineación en GPU ([CG Channel](https://www.cgchannel.com/2025/06/epic-games-releases-realityscan-2-0-and-realityscan-mobile-1-7/), [80.lv](https://80.lv/articles/realityscan-2-0-has-been-released)); la 2.1 mejoró la exportación a COLMAP ([notas 2.1](https://dev.epicgames.com/documentation/en-us/realityscan/realityscan-2-1)), útil para entrenar splats con el mismo solve.
- **COLMAP/GLOMAP** (libre) para SfM y **OpenMVS/Meshroom** para la malla: libre y reproducible, pero más lento y menos robusto en fachadas repetitivas.
- **Protocolo de captura para la UAP**: día **nublado** (luz difusa: facilita el delighting), anillos a 2 alturas con 70–80 % de solape, fotos a 45° de las esquinas y detalle de la puerta. Para techos: **vuelo con drone** respetando la normativa de ANAC y con permiso de la universidad. El mismo vuelo produce la **ortofoto** y el **DSM** del campus (secciones 2.5 y 4.5).
- **Post**: retopología o decimación (meshoptimizer/Blender), **delighting** (quitar sombras horneadas del albedo para que funcione el ciclo día/noche; p. ej. Agisoft Texture De-Lighter), hornear normales de la malla densa a la low-poly, `gltf-transform optimize` (meshopt + KTX2). Objetivo: **≤ 1,5 MB por hero asset** y ≤ 30 k triángulos.

### 3.2 Camera matching (fSpy) + Blender

- fSpy calcula la distancia focal y la orientación a partir de los puntos de fuga; el importador de Blender crea la cámara con la foto de fondo, así se modela "dentro de la foto" ([fSpy](https://github.com/stuffmatic/fSpy), [fSpy-Blender](https://GitHub.com/stuffmatic/fSpy-Blender), [80.lv](https://80.lv/articles/improving-blender-workflows-with-still-image-camera-matching-app)). Alternativas dentro de Blender: Perspective Plotter, Blenspy. Funciona mejor con arquitectura de aristas rectas.
- **Escala**: el footprint OSM da el largo de cada fachada, así que **importar el footprint de `world.json` a Blender** (script de export en `tools/`) y modelar encima garantiza que el GLB calce con el sistema de hero assets (HERO-1/2).
- La misma foto, proyectada desde la cámara de fSpy (*project from view*), da la textura de la fachada. Después se limpia y se tilea en la trim sheet.

### 3.3 Gaussian splatting: ¿para hero buildings?

- **Opciones en three.js**:
  - **`GaussianSplat` nativo** (`three/addons/objects/GaussianSplat.js`): llegó en r186, anda con `WebGPURenderer` **incluido su fallback WebGL2**, ordena automáticamente y soporta raycast **[r187 local]** ([Radiance Fields](https://radiancefields.com/platforms/spark)). Es la única opción que encaja con el renderer actual sin un segundo contexto.
  - **Spark 2.x** (World Labs, MIT, v2.4.0 en npm): LoD de splats con streaming `.RAD`, paginado en GPU, lee PLY/SPZ/SPLAT/KSPLAT/SOG ([repo](https://github.com/sparkjsdev/spark), [Spark 2.0](https://worldlabs.ai/blog/spark-2.0), [v2.3](https://radiancefields.com/spark-v2.3.0-fixes-on-demand-rendering-for-paged-lod)). Está construido **sobre `WebGLRenderer`** (GLSL), así que **no** sirve directamente con `WebGPURenderer` + TSL. Además el paquete pesa ~17 MB sin comprimir. Usarlo implicaría un segundo renderer o migrar.
  - GaussianSplats3D (mkkellogg): anterior; Spark lo reemplazó en la práctica.
  - WebGPU puro: [WebSplatter](https://arxiv.org/html/2602.03207v1) (evaluado en iPhone 15 Pro Max), [Gaussian Splat Lite](https://discourse.threejs.org/t/gaussian-splat-lite-1-0-webgpu-streaming-lod-and-depth-rendering-for-three-js/94234).
- **Por qué no como representación principal**: (1) los splats **no reciben la luz dinámica ni las sombras** del sol: con el ciclo día/noche, el Templo "fotografiado a las 11" se ve mal a las 19; (2) no tienen colisión (hay que conservar la del footprint, cosa que el sistema de hero assets ya hace); (3) peso: un edificio de 300 k–1 M splats en SPZ ocupa varios MB y no entra en los 15 MB iniciales; (4) en mobile, el ordenamiento de muchos splats cuesta mucho ([hilo](https://discourse.threejs.org/t/how-can-i-optimize-large-3d-gaussian-splat-ply-scenes-for-better-web-performance/93758)).
- **Uso recomendado**: modo **"visita fotográfica"** opcional (carga perezosa al acercarse, hora fijada a la de la captura) con el `GaussianSplat` nativo. Y usar el splat como **fuente** para extraer la malla: los métodos de superficie (2DGS, PGSR, 2D-SuGaR) dan mallas con menos error que SuGaR ([2DGS](https://arxiv.org/pdf/2403.17888), [2D-SuGaR](https://justusthies.github.io/posts/2dsugar/)), aunque con "flotantes" que hay que limpiar.

### 3.4 Rectificación de fachadas (homografía)

- Para cada foto: marcar las 4 esquinas de la fachada (o detectarlas con segmentos de línea), calcular `H` contra un rectángulo con la **relación de aspecto métrica** (largo del footprint × altura) y aplicar `warpPerspective` ([tutorial OpenCV](https://docs.opencv.org/4.2.0/d9/dab/tutorial_homography.html), [LearnOpenCV](https://learnopencv.com/homography-examples-using-opencv-python-c), pipeline de cuadrilátero de [Texture2LoD3](https://arxiv.org/pdf/2504.05249)). Enmascarar árboles, autos y cielo (ya se hace un keying del cielo en `tools/build-facade-photos.ts`).
- **Mejora sobre lo actual**: hoy la foto es un quad sobre **una** pared. Conviene rectificar por fachada (y por tramo si la planta es irregular), recortar la planta baja y el ritmo de vanos, y **derivar los parámetros de la gramática** (cantidad de bahías, ancho de ventana, color de muro) de la foto rectificada. Así la geometría con recesos coincide con la foto real y la foto pasa a ser albedo/decal, no una calcomanía plana.

### 3.5 IA: expectativas realistas

- **Imagen → 3D** (Hunyuan3D 2.5, TRELLIS 2, SAM 3D): los reportes de los propios autores y de vendors hablan de buena calidad en objetos; **no hay benchmarks en edificios** y las paredes rectas y aristas duras no son su fuerte ([Hunyuan3D 2.5](https://arxiv.org/abs/2506.16504), [comparativa 3D AI Studio](https://www.3daistudio.com/blog/trellis-2-vs-hunyuan-3d-differences-explained), [fal.ai](https://fal.ai/learn/devs/sam-3d-vs-hunyuan3d-2)). Úsenlos para **props** (bancos, cestos, la escultura del Pórtico, carteles), siempre pasando por retopo y KTX2.
- **Profundidad monocular**: Depth Anything V2 mejora en superficies transparentes, pero la escala métrica deriva fuera de dominio y falla en vidrio y metal ([Depth Anything V2](https://arxiv.org/html/2406.09414v2), [ISPRS 2026](https://isprs-archives.copernicus.org/articles/XLIX-B4-2026/679/2026/)). Sirve para estimar **profundidades relativas** (recesos de ventanas, salientes de aleros) en una foto ya rectificada.

---

## 4. Realismo de texturas y look

### 4.1 PBR y trim sheets para fachadas

- **Trim sheet**: una textura (color/normal/ORM) con bandas que tilean en horizontal (cornisa, zócalo, dintel, marco, alféizar, junta de losa, baranda) y zonas de "decal" ([Roblox Creator Hub](https://create.roblox.com/docs/tutorials/curriculums/environmental-art/develop-polished-assets), [GameTextures: trim kits](https://medium.com/gametextures/unique-uvs-be-damned-make-art-quickly-with-trim-kits-full-tutorial-assets-included-2870dab5c56a), [80.lv tutorial](https://80.lv/articles/in-depth-tutorial-creating-advanced-trim-sheet-textures-for-games)). La gramática (2.1) asigna a cada rectángulo semántico una banda de la trim sheet: **un material para todas las fachadas**.
- **Atlas de muros**: 4–6 materiales de muro (ladrillo visto, revoque blanco, revoque crema, hormigón, piedra) en un `CompressedArrayTexture` (capa = material); el `vertexColor` sigue tiñendo. Esto reemplaza las mallas `walls:${kind}` por una sola.
- **Decals**: manchas de escurrimiento bajo los alféizares, humedad en el zócalo, carteles institucionales, rejillas de aire acondicionado (muy presentes en Argentina), rejas. Como **geometría decal** (quads con offset y `polygonOffset`) dentro del mismo `BatchedMesh` y con un atlas de decals.

### 4.2 Weathering y máscaras

- Ya hay grime por altura y manchas de ruido en `facadeNode.ts`. Para hacerlo creíble: (a) **AO horneado por vértice** en la base y bajo los aleros (del skeleton de techos se conoce el alero); (b) **máscara de escurrimiento** = ruido estirado en Y debajo de cada alféizar (posición conocida por la gramática); (c) **variación por edificio** (seed por id OSM); (d) **suciedad hacia el suelo** con un gradiente por altura sobre el terreno real (no sobre `groundY`).

### 4.3 Detail normals y triplanar

- **Detail normal** de 256 px tileando a 0,5 m sobre revoques y hormigón: mezclar con la normal base usando *whiteout*/RNM. Es barato y suma mucho a menos de 10 m.
- **Triplanar** solo donde no hay UVs confiables: taludes del terreno, techos irregulares del skeleton y hero assets escaneados sin UV2. Cuesta 3 lecturas por textura, así que conviene limitarlo con `if` por pendiente.

### 4.4 Splatting de terreno con mezcla por altura

- Hoy: splat RGB (pasto/tierra/pavimento) con mezcla lineal. Mejoras: **height blend** (cada capa usa su altura o luminancia para decidir el borde: pasto que "cubre" la tierra en los bordes, [gamedev.net](https://gamedev.net/tutorials/programming/graphics/advanced-terrain-texture-splatting-r3287)), **anti-tiling** con muestreo estocástico de *tile & blend* de Heitz-Neyret ([Jason Booth](https://medium.com/@jasonbooth_86226/stochastic-texturing-3c2e58d76a14)) o la variante de 2 lecturas rotadas ([Unity Terrain Samples](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.4/manual/Shader-Graph-Sample-Terrain-Solutions.html)), y una **macro-variación** de baja frecuencia (o la ortofoto, 4.5) que rompa la repetición a más de 50 m ([Andersson, Frostbite 2007](https://www.advances.realtimerendering.com/s2007/Andersson-TerrainRendering(Siggraph07)-CourseNotes.pdf)).
- Pasar el splat del canvas (8 bits, en runtime) a **un KTX2 generado en tools** de 2 canales extra: humedad/desgaste junto a caminos y "pisado" en atajos. Así se libera CPU en la carga.

### 4.5 Ortofoto como albedo lejano

- **Licencias**: no se puede usar Google (ya prohibido en el README); Esri y Bing permiten trazar en OSM pero **no** redistribuir sus imágenes. Opciones legales:
  1. **Vuelo propio con drone** (ideal: 2–5 cm/px, con permiso de la UAP y cumpliendo la normativa ANAC). También da el DSM y la fotogrametría de los techos.
  2. **IGN Argentina**: publica ortofotos urbanas por WMTS (`ide.ign.gob.ar/.../sensores_remotos/...`), por ejemplo "Santa Fe y Paraná". No encontré cobertura de Libertador San Martín: hay que verificarlo en el catálogo vigente ([JOSM wiki Maps/Argentina](https://josm.openstreetmap.de/wiki/Maps/Argentina?version=49)). También conviene revisar la IDE de Entre Ríos ([IDEER](https://geoservicios.entrerios.gov.ar/)).
  3. **Sentinel-2** (Copernicus, 10 m, libre): sirve **solo para el anillo exterior** (campos alrededor del campus, el `skirt` del terreno) y para el color medio del paisaje en el horizonte.
- **Uso en el shader**: `albedo = mix(splatPBR, orthoColor * k, smoothstep(60, 250, distanciaCámara))`. Normalizar la ortofoto (quitar sombras y viñeteo y ajustar la luminancia media para que coincida con las texturas PBR). Tamaño: 2048² sobre ~900 m ≈ 44 cm/px, unos 1–1,5 MB en ETC1S. Recuperar el área bajo las copas de árboles de la ortofoto con *inpainting*, o el pasto "tendrá" copas pintadas.

### 4.6 Cielo y atmósfera

- Hoy: `SkyMesh` (Preetham) con nubes, IBL por PMREM regenerado cada 0,2 h y `FogExp2`. Es razonable y barato.
- **Upgrade físico**: [`@takram/three-atmosphere`](https://docsearch.algolia.com/mcp/docs/repo/takram-design-engineering/three-geospatial) implementa Bruneton (LUTs precalculadas de transmitancia y scattering), **aerial perspective** (reemplaza la niebla por scattering real), sol y luna; tiene entrada WebGPU con three ≥ 0.182 (v0.19.1, mayo 2026). Las **nubes volumétricas** (`@takram/three-clouds`) todavía son GLSL o `postprocessing` y **no soportan WebGPU** ([README](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)). Antes de adoptarlo: medir el tamaño de las LUTs (el paquete pesa ~37 MB sin comprimir; las LUTs se pueden generar en runtime) y el costo del aerial perspective en mobile.
- Nubes en mobile: mantener las del `SkyMesh` o una cúpula con textura de nubes animada; sombra de nubes con una textura de ruido proyectada (multiplica la luz del sol en el shader del terreno), que es barata y da mucha vida.

### 4.7 Grading, AA y efectos de pantalla

- **Grading**: reemplazar el contraste/saturación manual por un **LUT 3D** (`Lut3DNode`, r187 **[r187 local]**) autorado en DaVinci Resolve o Photoshop sobre capturas del juego, con **dos o tres LUTs por hora** (mañana, mediodía, atardecer) interpoladas.
- **AA**:
  - WebGPU, alto: **TRAA** (requiere MSAA desactivado y MRT de velocidad) o **TAAU** (AA + reescalado en una pasada, útil para bajar la resolución interna) **[r187 local]**. Cuidado con el ghosting en el follaje con viento.
  - Medio: **SMAA** (antes de la conversión a sRGB) o MSAA 4× (con MRT de AO es caro).
  - Bajo/iPhone: **FXAA** después del tone mapping o sin AA y con DPR 1–1,25. `FSR1Node` solo si el cuello de botella es el fragment shader.
- **SSR**: `SSRNode` existe en r187 (modo estocástico con GGX) **[r187 local]**. En el campus sirve casi solo para **charcos y vidrios**: en vidrio, un `envMap` + Fresnel ya resuelve el 90 %. Prioridad baja.
- **SSGI**: `SSGINode` (presets low 1×12 a high 3×16 con filtrado temporal, [docs](https://threejs.org/docs/pages/SSGINode.html)): rebote de color de ladrillo sobre veredas. Caro: solo en "alto" de escritorio y con TRAA.
- **GTAO**: ya está a ½ resolución. Con AO de terreno horneado (1.6) se puede **apagar en mobile** sin perder lectura del contacto con el suelo.

---

## 5. Roadmap priorizado para ESTE repo (top 15)

Orden = impacto / esfuerzo, con dependencias. Esfuerzo: **S** ≤ 2 días, **M** 3–7 días, **L** > 1 semana. Cada ítem debe nacer como spec (`specs/0xx-*.md`) con criterios numerados y tests, según el flujo del repo.

| # | Ítem | Esfuerzo | Ganancia esperada |
|---|---|---|---|
| 1 | Medición real y presupuesto por frame | S | Decisiones con datos |
| 2 | Sombras: presupuesto, caché estática y follaje | M | −2 a −6 ms GPU, −200 MB VRAM en alto |
| 3 | Techos por straight skeleton (offline) | M | Siluetas reales |
| 4 | Gramática de fachada con recesos reales | L | El mayor salto de realismo a corta distancia |
| 5 | Trim sheet + atlas de muros + decals | M | Material único, detalle de cornisas y marcos |
| 6 | Impostores octaédricos de árboles | M | Fill-rate y sombras de follaje |
| 7 | Culling por celdas + `BatchedMesh` de mobiliario | M | Culling en cámara y cascadas, props baratos |
| 8 | AO/visibilidad de cielo horneada del terreno + height blend | M | Contacto con el suelo sin GTAO en mobile |
| 9 | Ortofoto o macro-albedo a distancia | S–M | Fin de la repetición de texturas a lo lejos |
| 10 | Red vial con cruces, veredas y ochavas (Clipper2) | L | Calles creíbles, sin z-fighting |
| 11 | Física: Rapier no-compat o controlador con BVH | M | −1 a −4 MB, arranque más rápido |
| 12 | Normales UASTC + arrays de capas de suelo | S | Normales limpias, menos samplers |
| 13 | AA/post por perfil + LUT | S–M | Imagen más estable y look autorado |
| 14 | Compilación sin hitches y calidad adaptativa | S | Sin congelamientos al cambiar calidad ni por térmica |
| 15 | Pipeline de hero assets desde fotos (+ splat opcional) | L | Edificios icónicos fieles |

### 1. Medición real y presupuesto por frame — **S**
- **Objetivo**: saber dónde se van los ms en iPhone, Android medio y laptop con iGPU antes de optimizar.
- **Enfoque**: `trackTimestamp` (solo WebGPU) con `resolveTimestampsAsync` por frame; tiempos CPU por sistema (loop) y por pasada (sombra/principal/post) con `performance.now()`; `info.memory`; un **modo benchmark** `?bench` que recorre 3 cámaras fijas durante 20 s y vuelca p50/p95 en pantalla (el Artifact no tiene consola). Presupuestos objetivo: mobile 33 ms (30 fps) y desktop 16,6 ms.
- **Archivos**: `src/ui/DebugOverlay.ts`, `src/app/bootstrap.ts`, `src/render/RendererFactory.ts`, nuevo `src/app/Benchmark.ts`, `tools/e2e/`.
- **Ganancia**: habilita todos los demás ítems y evita optimizar a ciegas.

### 2. Sombras: presupuesto, caché estática y follaje — **M**
- **Objetivo**: bajar el costo de sombras, el mayor gasto probable.
- **Enfoque**: (a) perfiles: alto 3×2048², medio `SunLight` 2×2048², bajo **mapa estático de todo el campus** (`autoUpdate = false`, `needsUpdate` al cambiar la hora más de 0,1 h) + sombra blob para personajes; (b) árboles con `castShadow` solo en LOD 0, y LOD 1 o impostor sin sombra o con impostor-sombra; (c) bounds reales en las instancias (no `frustumCulled = false`) para que cada cascada descarte; (d) `maskShadowNode`/`alphaTest` en el follaje.
- **Archivos**: `src/render/sky/SkySystem.ts`, `src/domain/quality/QualityProfiles.ts` (+ tests de `specs/010`), `src/world/vegetation/TreeSystem.ts`, `src/render/materials/VegetationMaterialLibrary.ts`, `src/player/CharacterView.ts` (blob).
- **Ganancia (estimada)**: −2 a −6 ms GPU en desktop medio; −200 MB de VRAM en "alto"; perfil bajo prácticamente sin costo de sombras por frame.

### 3. Techos por straight skeleton, calculados offline — **M**
- **Objetivo**: techos a 4 aguas, 2 aguas, piramidales y skillion en **cualquier** footprint (hoy solo en casi-rectángulos; el resto queda plano).
- **Enfoque**: `straight-skeleton` (CGAL WASM) en `tools/build-world.ts`; para los hastiales, levantar los vértices del skeleton sobre las aristas marcadas como `gable` (o usar el fork pesado). Guardar en `world.json` `roof.faces: Vec3[][]` en coordenadas locales. Aleros con offset del contorno. Agregar overrides de `roof:shape`/`roof:height`/`building:levels` en `reference/` por edificio, con fuente citada (el pipeline ya cita fuentes).
- **Archivos**: `tools/build-world.ts`, `tools/lib/world/*`, `shared/world/types.ts` + `validate.ts`, `src/world/buildings/BuildingGeometryBuilder.ts` (consume caras), `specs/003-world-build.md`.
- **Ganancia**: silueta correcta del campus vista desde lejos (lo primero que lee el ojo). Costo en runtime: 0 (unos KB más en `world.json`).

### 4. Gramática de fachada con geometría real de ventanas — **L**
- **Objetivo**: ventanas con **receso real** (15–25 cm), marcos, alféizares que sobresalen, zócalo, cornisa, puerta en la entrada OSM y planta baja diferenciada.
- **Enfoque**: mini split-grammar en TS puro (2.1) → rectángulos semánticos por cara → geometría con recesos **solo en el LOD cercano** (menos de 120 m, por celda), y el shader actual (`facadeNode.ts`) para lejos, alimentado con los **mismos** parámetros (bahía, piso, ancho de ventana) por vértice para que coincidan. Vidrio: material propio con `envMap` (IBL del cielo) + Fresnel + "interior mapping" barato (parallax de una habitación con un atlas de 4 interiores) para reemplazar el oscuro plano.
- **Archivos**: nuevo `shared/world/facadeGrammar.ts` (o `src/domain/buildings/`), `src/world/buildings/BuildingGeometryBuilder.ts`, `BuildingsBuilder.ts`, `src/render/materials/nodes/facadeNode.ts`, nuevo `glassNode.ts`, `specs/009-visuals.md`.
- **Ganancia**: es el mayor salto de realismo a la distancia en la que juega la cámara (3–30 m); la luz rasante del sol produce sombras reales dentro de los vanos.

### 5. Trim sheet + atlas de muros + decals — **M**
- **Objetivo**: un único material para todas las fachadas procedurales, con detalle de cornisas, marcos y zócalos, más suciedad localizada.
- **Enfoque**: tool que arma la trim sheet (1024×2048: bandas CC0 de ambientCG/Poly Haven + bandas propias horneadas en Blender) y un `CompressedArrayTexture` de 4–6 muros; UVs desde la gramática (ítem 4); decals de escurrimiento, humedad y carteles en el mismo batch.
- **Archivos**: nuevo `tools/build-trimsheet.ts`, `tools/lib/assets/ktx2.ts`, `src/render/textures/TextureLibrary.ts`, `src/render/materials/PbrMaterialLibrary.ts`, `facadeNode.ts`.
- **Ganancia**: de N mallas de muro a 1; detalle que hoy no existe; unos +0,8–1,2 MB.

### 6. Impostores octaédricos de árboles — **M**
- **Objetivo**: LOD 2 de follaje casi gratis y sombras lejanas baratas.
- **Enfoque**: hornear al cargar un atlas de 8×8 vistas (color + normal) por especie con el renderer actual (sirve en los dos backends, 0 bytes de descarga); un shader de impostor TSL que mezcla 3 vistas; `TreeSystem` pasa a 3 bandas (LOD 0 < 40 m, LOD 1 < 120 m, impostor hasta 650 m). Viento: balanceo del quad.
- **Archivos**: nuevo `src/world/vegetation/ImpostorBaker.ts`, `TreeSystem.ts`, `TreeVariant.ts`, `src/render/materials/VegetationMaterialLibrary.ts`.
- **Ganancia (estimada)**: −50 a −80 % de vértices y overdraw del follaje lejano; permite subir la densidad de árboles hacia el horizonte (los bordes del campus son arbolados).

### 7. Culling por celdas + `BatchedMesh` de mobiliario — **M**
- **Objetivo**: recuperar el frustum culling (cámara y cascadas) sin multiplicar draws, y poblar el campus de mobiliario.
- **Enfoque**: dividir edificios, calles y cordones en celdas de 128 m (merge por celda y por material); `BatchedMesh` para bancos, cestos, faroles, bolardos, bicicleteros y carteles, con reglas de colocación en `domain/props/placement.ts` (2.6); árboles con instancias agrupadas por celda o con un `boundingSphere` real.
- **Archivos**: `src/world/buildings/BuildingsBuilder.ts`, `src/world/roads/RoadsBuilder.ts`, `src/world/props/PropsBuilder.ts`, `StreetLamps.ts`, `src/domain/props/placement.ts` (+ tests).
- **Ganancia**: menos triángulos en las cascadas (sobre todo la 1.ª); cientos de props en pocos draws.

### 8. AO del terreno horneada + height blend — **M**
- **Objetivo**: contacto edificio-suelo y árbol-suelo creíble sin depender de GTAO (que en mobile se apaga).
- **Enfoque**: tool en Node que calcula la visibilidad del cielo (64 rayos hemisféricos) sobre el heightfield + extrusiones de edificios y copas de árboles (cilindros), a 0,5 m/texel (unos 1800×1650 px) → KTX2 de un canal; AO por vértice en la base de las paredes; mezcla por altura y anti-tiling en `surfaceNodes.ts`.
- **Archivos**: nuevo `tools/bake-terrain-ao.ts`, `src/world/terrain/GroundBuilder.ts`, `GroundPainter.ts` (mover a tools), `src/render/materials/nodes/surfaceNodes.ts`.
- **Ganancia**: la lectura del mundo "apoyado" mejora mucho en todos los perfiles; unos +0,3–0,5 MB.

### 9. Ortofoto o macro-albedo a distancia — **S–M**
- **Objetivo**: eliminar la repetición de las texturas de suelo a más de 60 m y dar el color real del campus (caminos de tierra, canchas, manchas de pasto).
- **Enfoque**: primero **macro-albedo procedural** (ruido + splat suavizado: S). Cuando haya imagen legal (drone propio o IGN, ver 4.5), ortofoto 2048² normalizada; Sentinel-2 para el `skirt`.
- **Archivos**: nuevo `tools/fetch-ortho.ts`, `src/render/materials/nodes/surfaceNodes.ts`, `src/world/terrain/TerrainMeshBuilder.ts`, `CREDITS.md`.
- **Ganancia**: gran mejora en vistas aéreas o de la cámara alejada; ~1–1,5 MB.

### 10. Red vial con cruces, veredas y ochavas — **L**
- **Objetivo**: calzadas unidas sin solapes, cordones continuos, veredas reales, ochavas y sendas peatonales.
- **Enfoque**: 2.4: offset + unión + diferencia con Clipper2 en tools, CDT, drapeo con subdivisión, `polygonOffset` en vez de `LIFT`; borrar el hack `CoveredTest`.
- **Archivos**: nuevo `tools/build-roads.ts` (o `tools/lib/world/roads.ts`), `shared/geo/clip.ts`, `shared/world/types.ts`, `src/world/roads/RoadGeometryBuilder.ts`, `RoadsBuilder.ts`, `GroundPainter.ts` (usar los polígonos), `specs/003`.
- **Ganancia**: elimina el defecto más visible a nivel del suelo (cruces y cordones), y de paso da polígonos exactos para el splat y para colocar mobiliario.

### 11. Física: Rapier no-compat o controlador propio con BVH — **M**
- **Objetivo**: recuperar presupuesto de carga y tiempo de arranque.
- **Datos**: `rapier3d-compat` 0.21 = `rapier.mjs` de 4,3 MB (WASM de 3,08 MB en base64). El paquete no-compat trae el `.wasm` de 3,08 MB aparte (medido en npm).
  - **Despliegue web normal**: `.wasm` separado + `instantiateStreaming` + brotli lo dejan en ~1 MB transferido (estimado), con compilación en paralelo.
  - **Artifact**: el shim de `tools/stage-artifact.py` pasa los binarios a base64 igual (+33 %), así que la ganancia es de solo ~0,2 MB. El beneficio real ahí es sacar 4 MB del JS que se parsea en el arranque. Hay que agregar `wasm` a la regex `BIN` del shim y servir con `Content-Type: application/wasm` (o usar `WebAssembly.instantiate` con un `ArrayBuffer`).
  - **Alternativa más agresiva**: el juego usa Rapier solo para el character controller y los rayos de cámara contra terreno, cajas y troncos. Un controlador de cápsula sobre `three-mesh-bvh` (MIT, tiene un ejemplo oficial de character movement) **ahorraría ~4 MB**. A cambio hay que reimplementar autostep/snap y perder simulación de cuerpos (la bici es cinemática, ver `BikeModel.ts`). Si a futuro se suma multijugador (Colyseus), la física autoritativa podría correr en el server.
- **Archivos**: `src/physics/RapierPhysicsWorld.ts` (o nuevo `BvhPhysicsWorld.ts` detrás del puerto `PhysicsWorld`), `src/app/createPhysics.ts`, `vite.config.ts`, `tools/stage-artifact.py`, `tools/check-bundle-size.ts`, tests de física.
- **Ganancia**: −0,2 a −4 MB según la opción; menos tiempo de parseo en iPhone.

### 12. Normales UASTC + arrays de capas de suelo — **S**
- **Objetivo**: quitar los artefactos de bloque de ETC1S en las normales y simplificar los samplers.
- **Enfoque**: `role === 'normal'` → UASTC (nivel 2, RDO, Zstd) o ETC1S con RG separado; ORM empaquetado (R = AO, G = rough) en una textura; suelo en `CompressedArrayTexture`.
- **Archivos**: `tools/lib/assets/ktx2.ts`, `tools/fetch-textures.ts`, `src/render/textures/TextureLibrary.ts`, `surfaceNodes.ts`.
- **Ganancia**: normales limpias en ladrillo, adoquín y asfalto (visibles con sol rasante); entre −1/3 de lecturas y +0,5 MB.

### 13. AA/post por perfil + LUT — **S–M**
- **Objetivo**: una imagen estable (sin parpadeo en el pasto ni en las ventanas) y un look autorado.
- **Enfoque**: alto + WebGPU: TRAA (antialias del canvas en false, MRT de velocidad); medio: SMAA; bajo: FXAA o nada. Pasar el grading a `Lut3DNode` con LUTs por momento del día. Opcional en alto: `SSGINode` low preset.
- **Archivos**: `src/render/post/PostPipeline.ts`, `src/render/RendererFactory.ts`, `src/domain/quality/QualityProfiles.ts`, nuevo `public/luts/`.
- **Ganancia**: calidad percibida mucho mayor; costo controlado por perfil.

### 14. Compilación sin hitches y calidad adaptativa — **S**
- **Objetivo**: cero congelamientos visibles.
- **Enfoque**: `compileAsync` de cada perfil de calidad antes de aplicarlo; precompilar hero GLB, NPCs y bici al cargarlos (`compileAsync(obj, camera, scene)`); `initTexture` para texturas grandes; `QualityManager` adaptativo por p95 (baja `renderScale` y densidad de pasto si el frame supera el presupuesto durante 5 s); `powerPreference: 'default'` en mobile y manejo de `webglcontextlost`.
- **Archivos**: `src/app/bootstrap.ts`, `src/app/QualityManager.ts`, `src/render/RendererFactory.ts`, `src/render/RenderSystem.ts`.
- **Ganancia**: estabilidad en iPhone (térmica) y al cambiar ajustes.

### 15. Pipeline de hero assets desde fotos (+ splat opcional) — **L**
- **Objetivo**: Templo, Biblioteca, Pórtico y Auditorio fieles a la realidad.
- **Enfoque**: (a) export del footprint OSM a Blender (`tools/export-footprint-gltf.ts`) → fSpy → modelado sobre el footprint → textura proyectada y rectificada → trim sheet compartida; (b) Templo y Pórtico por fotogrametría (RealityScan + drone para el techo), con delighting, retopo y bake; (c) `tools/optimize-hero.ts` con `gltf-transform` (meshopt + KTX2 + LODs con meshoptimizer), validación de origen y escala (HERO-2) y presupuesto ≤ 1,5 MB y ≤ 30 k triángulos; (d) **carga perezosa** después del spawn (fuera de los 15 MB iniciales: el procedural queda de placeholder hasta que llega el GLB); (e) opcional: modo "visita fotográfica" con el `GaussianSplat` nativo de three, hora fija y carga bajo demanda.
- **Archivos**: `src/world/buildings/HeroAssetSystem.ts`, `heroPlacement.ts`, `specs/011-hero-assets.md` (nuevos criterios: carga diferida, presupuesto, LOD), nuevos `tools/optimize-hero.ts` y `tools/export-footprint-gltf.ts`.
- **Ganancia**: los edificios que la gente reconoce pasan de "genéricos" a "reales"; impacto sobre la carga inicial nulo.

### Dependencias y orden sugerido

```
1 ──► 2 ──► 6 ──► 7
│           └──► 14
├──► 3 ──► 4 ──► 5 ──► 15
├──► 12 ──► 8 ──► 9
├──► 10 (independiente, largo)
├──► 11 (independiente)
└──► 13
```
Sprint 1: 1, 2, 12, 14. Sprint 2: 3, 6, 13. Sprint 3: 4, 5. Sprint 4: 7, 8, 9. En paralelo, cuando haya fotos y vuelo: 10, 11, 15.

### Presupuesto de bytes resultante (estimado)

| Ítem | Δ carga inicial |
|---|---|
| Hoy (STATUS) | ~9 MB sin comprimir |
| Trim sheet + atlas + decals | +1,0 |
| AO terreno + macro/ortho | +1,5 |
| Normales UASTC | +0,5 |
| LUTs | +0,1 |
| Rapier no-compat (Artifact) / BVH | −0,2 / −4,0 |
| Hero assets / splats | 0 (diferidos) |
| **Total** | **~8–12 MB** (< 15 MB) |

---

## Notas sobre la investigación

- No se pudo abrir `sparkjs.dev` desde este entorno (red restringida): los datos de Spark salen del repo y npm (`@sparkjsdev/spark@2.4.0`) y de notas de prensa.
- Las APIs de three r187 citadas como **[r187 local]** se verificaron en `node_modules/three` (CSMShadowNode, SunLight/SunLightShadow, TileShadowNode, LightMapper, unwrapUVs, LightProbeGrid, VXGI, TRAA/TAAU/FSR1/SMAA/FXAA/SSR/SSGI/Lut3D, GaussianSplat, `BufferGeometry.setIndirect`, `LightShadow.autoUpdate/needsUpdate`, `NodeMaterial.maskShadowNode/castShadowNode`, deprecaciones r181–r187).
- Los tamaños de paquetes salen de `npm view`/tarballs en noviembre 2026: `straight-skeleton@3.0.0` (`dist/index.js` 1,03 MB), `@dimforge/rapier3d@0.21.0` (`.wasm` 3,08 MB), `rapier3d-compat` (`rapier.mjs` 4,3 MB), `@three.ez/instanced-mesh@0.3.16`, `@three.ez/batched-mesh-extensions@0.0.12`, `clipper2-ts@2.0.1-19` (BSL-1.0), `@takram/three-atmosphere@0.19.1`.
