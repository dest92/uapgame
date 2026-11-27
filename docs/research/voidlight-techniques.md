# Voidlight Depths: técnicas de generación procedural y qué aplicar al Campus UAP

> Investigación técnica de *VOIDLIGHT DEPTHS* (https://kevintngo.github.io/voidlight/), de Kevin T. Ngo (GitHub `kevintngo`).
> Fecha: 2026-11-27. No se modificó código del repo.

## 0. Fuentes y método

- `index.html` publicado (164 805 B). Dentro hay un `<script type="z">` con el JS comprimido con **deflate** y codificado en **base-91 por pares de caracteres** (13 bits por par). Un cargador de unas 600 B lo decodifica, lo descomprime con `DecompressionStream('deflate')` y lo inyecta como `<script type="module">`. Decodificado ocupa **383 kB** de JS minificado (unas 23 700 líneas tras prettier).
- **Repositorio público** `github.com/kevintngo/voidlight` (un solo commit, "Add VOIDLIGHT DEPTHS"). Tiene el **código fuente legible y comentado** en `src/` (22 módulos `01_core.js` … `17_mobile.js`) y el pipeline de build (`build.sh`, `tools/minify.py`, `tools/pack.py`). Los comentarios de cabecera de cada módulo son la única "documentación" del autor.
- Búsqueda web: **no encontré devlog, README ni post** del autor sobre el juego. El repo no tiene README. Todo lo que sigue sale de leer el código.
- Copias de trabajo (scratchpad): `.../scratchpad/voidlight/game.js` (decodificado), `.../scratchpad/pp/game.js` (formateado) y `.../scratchpad/vlrepo/src/` (fuente original).

---

## 1. Stack, arquitectura y trucos de tamaño

### Stack
- **WebGL2 crudo** con un **motor propio** ("HAND-BUILT WEBGL2 ENGINE", `01b_engine.js`, 45 kB). No usa three.js ni WebGPU. El motor imita la API de three.js (`BoxGeometry`, `CylinderGeometry`, `LatheGeometry`, `BufferAttribute`, `InstancedMesh`, `ShaderMaterial` con `uniforms`/`vertexShader`), así que el código de juego se lee como three.js pero corre sobre unos 1 500 tokens de motor.
- Shaders GLSL ES 3.00 en template strings. Hay **un solo programa PBR "über"** con variantes por `#define` (`INST`, `ATEST`, `V_FLOOR`, `V_WALL`, `V_PULSE`, `V_BANNER`, `V_OOZE`), compiladas bajo demanda y cacheadas por clave.
- Contexto: `antialias:false, depth:false, stencil:false, alpha:false`. Toda la escena se renderiza en render targets propios (RGBA16F más depth texture).

### Arquitectura (módulos del fuente)
| Módulo | Contenido |
|---|---|
| `01_core` | RNG mulberry32, hash 2D entero, value noise **periódico** (tileable), fbm, Voronoi/Worley tileable, fuente bitmap 5×7 |
| `01b_engine` | matemáticas, grafo de escena, primitivas, texturas, RT, PBR forward, sombras, instancing |
| `02_tex` | **texturas PBR procedurales** (color/normal/ORM/emisivo) y biblioteca de materiales |
| `03_geom` | caché de primitivas, **batcher estático por material y chunk**, **"Kit" de modelado**, rigs |
| `04_gx` | cámara, rig de luces, **pipeline HDR de post-proceso** |
| `05_fx` | partículas GPU, polvo iluminado, decals, telegraphs |
| `06_deckgen` / `09_build` | generación del nivel (grid) y **construcción time-sliced** (generadores `yield`) |
| `07_props*` / `08_themes*` | **biblioteca de props modelados en código con el Kit** y 12 temas (catedral-reactor, jungla hidropónica, criogenia…) |
| `15_audio` | síntesis WebAudio |

### Trucos de tamaño
1. **Minificador propio por tokens** (`tools/minify.py`): renombra de forma consistente en todo el programa variables **y nombres de propiedades propias** (por eso aparecen `cA`, `bX`, `hE`…). Preserva palabras clave, nombres de API de plataforma (lista `platform.txt`) y toda palabra que aparezca dentro de un string. También elimina espacios y comentarios del GLSL embebido.
2. **deflate nivel 9 más base-91** dentro del HTML (`tools/pack.py`): 383 kB de JS quedan en unos 130 kB comprimidos y unos 160 kB de texto.
3. **Cero assets**: texturas, mallas, fuente, audio y cielo se generan en código. La fuente es un bitmap 5×7 guardado como enteros.
4. **Código "data-driven"**: un prop es una cadena de llamadas al Kit (`k.at(...).aG('trim',...).cyl(...)`); un material es una función de 10 a 20 líneas evaluada por texel.

---

## 2. Geometría procedural

### 2.1 Primitivas (no hay CSG, SDF ni bevel)
Hallazgo importante: **Voidlight no usa CSG, raymarching de SDF para geometría, extrusiones de perfiles 2D arbitrarios, desplazamiento por ruido ni biselado.** Todo se arma con un set pequeño de primitivas indexadas con normales y UV:

```js
G.box  = new BoxGeometry(1,1,1);              G.boxB = new BoxGeometry(1,1,1).translate(0,.5,0); // pivote en la base
for (const s of [4,5,6,8,10,12,16]) { G['cyl'+s] = new CylinderGeometry(1,1,1,s).translate(0,.5,0);
                                      G['cone'+s] = new CylinderGeometry(0,1,1,s).translate(0,.5,0); }
G.sph, G.sphLo (LOD bajo 7×5), G.hemi, G.ico/oct/dod/tet (poliedros flat-shaded),
G.torus (tubo fino), G.torusFat, G.plane, G.disc, G.ring
```

La pieza "arquitectónica" clave es el **torno (lathe) con perfil de columna gótica**, escrito a mano como lista de puntos (radio, altura):

```js
// a gothic column profile, and a broad bowl
G.column = latheG([[.5,0],[.5,.12],[.42,.16],[.44,.24],[.36,.3],[.33,.34],   // basa con toros/escocias
                   [.3,2.7],                                                  // fuste
                   [.33,2.74],[.4,2.8],[.36,2.86],[.5,2.96],[.52,3.06],[0,3.06]], 12); // capitel + ábaco
```

En el lathe, las normales se calculan desde la tangente del perfil (diferencia central entre puntos vecinos). Con 12 segmentos ya se ve redondo porque la cámara es ortográfica y lejana.

### 2.2 El "Kit" de modelado: kitbash por código
Una clase (`yl` / Kit) mantiene una **transformación base** (`at(x,y,z,rotY,scale)`) y un **tinte por vértice** (`tint`). Cada llamada **hornea** la primitiva transformada dentro del batch de su material:

```js
P.column = (k, x, z, h = 3.2, top = 0) => {
  const s = h / 3.06;
  k.at(x, 0, z, 0);
  k.boxB('iron', 0, 0, 0, 1, .2, 1)                        // plinto
   .geo(G.column, 'stone', 0, .2, 0, 1, s, 1)              // fuste torneado, escalado en Y
   .ring('trim', 0, .2 + .32 * s, 0, .37, true, HPI, 0, 0, .05)   // anillo de bronce en la basa
   .ring('trim', 0, .2 + 2.72 * s, 0, .35, true, HPI, 0, 0, .05)  // collarino
  k.boxB('trim', 0, .2 + h, 0, 1.08, .14, 1.08);           // ábaco/capitel cuadrado
  ...
};
```

Primitivas compuestas del Kit:
- `beam(mat, p0, p1, r, seg)`: **cilindro entre dos puntos** (cuaternión desde +Y a la dirección). Sirve para tuberías, cables y patas.
- `bar(mat, p0, p1, w, d)`: **caja entre dos puntos**. Con ella construye **arcos y nervaduras de bóveda segmentados**:

```js
// pilastra "grand": nervadura de bóveda que arranca del capitel (5 segmentos de arco)
for (let i = 0; i < 5; i++) {
  const a0 = i/5*1.25, a1 = (i+1)/5*1.25, r = 1.9;
  k.bar('wall', 0, h-.1+Math.sin(a0)*r, .2+(1-Math.cos(a0))*r,
                0, h-.1+Math.sin(a1)*r, .2+(1-Math.cos(a1))*r, .26, .2);
}
```

- **Molduras por capas**: zócalo, cornisa y pilastra se hacen con cajas apiladas de **profundidad creciente** (0.08, 0.12; 0.22, 0.30, 0.36). Así se lee un perfil escalonado sin extruir ningún perfil:

```js
k.at(s.x,0,s.z,s.rot).boxB('trim',0,0,.04,2,.16,.08)          // zócalo
                     .boxB('trim',0,s.h-.16,.06,2,.16,.12);   // cornisa
// pilastra: fuste + basa + doble capitel saliente
k.boxB('wall',0,0,.1,.46,h,.22).boxB('trim',0,0,.13,.56,.22,.3)
 .boxB('trim',0,h-.34,.13,.58,.16,.3).boxB('trim',0,h-.14,.16,.66,.14,.36);
```

- **Ventana ("viewport")**: un plano emisivo (que muestrea el cielo procedural en screen-space, un efecto "portal") más un marco de 4 cajas más **montantes y travesaño** (`n = round(w/1.1)`), más 2 **quads aditivos de haz de luz** inclinados hasta el suelo, más un **spot light con sombra** y un **decal de charco de luz** en el piso.
- **Catenarias**: un cable entre dos puntos se hace con 6 `beam` siguiendo `lerp(p0,p1,t) - sin(t·π)·sag`.

### 2.3 Paredes, suelos y "AO horneado" en vértices
Muros y suelos del nivel son **quads emitidos directamente** (`quad(mat, a,b,c,d, normal, c0..c3, tint)`) con **4 valores de oclusión por esquina** en el color de vértice:
- Muros: `cb` abajo (0.5) y `ct` arriba (1.0), un degradado vertical de AO de contacto con el piso.
- Suelo: cada esquina vale 0.58 si alguna celda vecina (de las 3 que la tocan) es sólida. Es **AO de vértice estilo Minecraft**, gratis en runtime.
- Variación por celda: `g = 0.9 + hash(x,z)*0.2` multiplica el tinte y rompe la uniformidad.
- "Poché caps": las tapas de los muros cortados se dibujan con material oscuro (`cap`). **Nervaduras bajo el borde de la losa** (cada 2 celdas) hacen que el piso se lea como una placa gruesa seccionada.

### 2.4 UV: proyección "triplanar horneada"
Al hornear, si el material tiene `uvS` (metros por repetición), la UV se reemplaza por **coordenadas de mundo proyectadas según el eje dominante de la normal**. Es triplanar resuelto en CPU, sin costo en el shader y con densidad de texel constante en todo el mundo:

```js
if (fy >= fx && fy >= fz) U.push(wx*hq, wz*hq);   // cara horizontal → XZ
else if (fx >= fz)        U.push(wz*hq, wy*hq);   // cara ±X → ZY
else                      U.push(wx*hq, wy*hq);   // cara ±Z → XY
```

En cilindros calcula cuántas repeticiones caben en la circunferencia (`round(2πr / uvS)`) para que la textura no se estire.

### 2.5 LOD
No hay LOD geométrico clásico. En su lugar usa: **segmentación elegida por pieza** (cyl4 a cyl16, `sphLo` para lo pequeño), cámara ortográfica fija (detalle constante en pantalla) y **render a resolución reducida** (escala 2× a 3× con `NEAREST`). El "LOD" real es el **escalador de calidad adaptativo** (sección 6).

---

## 3. Texturas y materiales procedurales

### 3.1 Texturas PBR "por función de texel" (CPU, en el arranque)
`bakeSet(name, size, bumpStrength, fn, hasEmissive)` evalúa una función `fn(u, v, out)` por texel. La función escribe **altura, albedo, rugosidad, metalicidad, AO y emisivo**. Después:
- **Normal map derivado de la altura** por diferencias centrales con wrap (tileable):

```js
let dx = (H[xr] - H[xl]) * sc, dy = (H[yu] - H[yd]) * sc, il = 1/Math.sqrt(dx*dx + dy*dy + 1);
nrm = (-dx*il*.5+.5, -dy*il*.5+.5, il*.5+.5)
```

- **ORM empaquetado** (G = roughness, B = metalness). El **AO se multiplica en el albedo**.
- Ruido **periódico** (`noise(x,y,seed,periodX,periodY)` con `hash(mod(i,p))`), así que todas las texturas son **seamless** sin trucos posteriores.
- Ejecución **una textura por frame** durante el boot (generador con barra "FORGING MATERIALS").

Vocabulario de las recetas (24 materiales: iron, deck, brass, relief, cloth, stone, rust, resin, ice, crystal, leaf, bone, rubber, hazard, grate, crate, drum, marble, hull, panel…):
- **Celdas de ladrillo/placa** `cell(u*nx, v*ny, nx, ny, seed, stagger)` devuelve fracción, **id por celda** (para variar el tono) y **distancia al borde** (`dx,dy`). La junta es `smoothstep(0, .045, min(dx,dy))`. Es exactamente un patrón de ladrillo con hiladas desfasadas.
- **Remaches**: `1 - smoothstep(.035, .06, hypot(dx-.13, dy-.13))` suma altura.
- **Voronoi tileable** (`F1, F2, id, offset`): **grietas** con `smoothstep(0, .05, F2-F1)`, cristales facetados, hojas.
- **Desgaste**: `rust = smoothstep(.6,.85, fbm) * (1 - smoothstep(0,.5,distBorde))`. El óxido **se concentra cerca de juntas y bordes** y sube la rugosidad y baja la metalicidad. "Pintura saltada" con `smoothstep(.62,.7,fbm)` mezcla hacia metal desnudo.
- **Mármol**: vetas `1 - smoothstep(0,.08,|sin((u*3+v*2+fbm*2.2)·2π)|)` con baldosas ajedrezadas y junta de latón metálico.
- **Relieve ornamental** (rosetón/medallón): altura construida con funciones polares (`cos(a*12)`, anillos en `r`, bordes con `smoothstep`). Sin geometría, solo normal map.
- Micro-detalle: un ruido de alta frecuencia (`noise(u*96)`) con peso 0.06 en altura y rugosidad.

### 3.2 Variación en shader (espacio mundo) sobre la textura
Dentro del über-shader, por variante:
- `V_WALL`: `alb *= (.78+.44*fbm(vec2(x+z, y*1.7)*.16)) * (.62+.38*smoothstep(0,.9,y))`. Son **manchas a gran escala en mundo** y **oscurecimiento en la base** (grime/AO de contacto). Rompe la repetición de la textura de 512².
- `V_FLOOR`: albedo modulado por fbm, **charcos** (`smoothstep` sobre fbm): rugosidad 0.035, normal geométrica y alpha usado como **máscara de reflexión SSR**. También cáusticas animadas y escarcha según el tema.
- `V_PULSE`: emisivo que respira (`sin(t + worldPos)`).
- Canvas 2D solo para cosas "gráficas": banners heráldicos, pantallas de consola, atlas de glifos y splats.

### 3.3 Materiales de shader puros (sin textura)
Llama (quads cruzados con ruido scrolling y vertex wobble), holograma (scanlines), escudo hexagonal, **haz de luz** (`pow(v,1.3)*sin(u·π)*noise` aditivo), lava (fbm con domain warping), agua (glints `pow(n1*n2,3)`), portal (reproyecta el cielo en screen-space).

### 3.4 Normal mapping sin tangentes
No guarda tangentes: construye el **marco cotangente por derivadas de pantalla** (`dFdx(vW)`, `dFdx(vUv)`, al estilo Schüler). Funciona con cualquier malla horneada y con UV triplanar.

---

## 4. Iluminación, sombras, atmósfera y post (lo que lo hace "verse caro")

### 4.1 Shading
- **PBR GGX** (Smith height-correlated, Fresnel Schlick con aproximación `exp2`).
- **Iluminación ambiente analítica**: hemisferio cielo/suelo más una función `envC(dir, rough)` con dos lóbulos de "sol" coloreados (cálido y frío) cuyo exponente se ensancha con la rugosidad. El término especular usa la **aproximación analítica del split-sum de Karis (EnvBRDFApprox mobile)**, sin cubemap ni LUT.
- **8 luces puntuales** con **falloff con ventana** `(1-(d/r)^4)^2 / d^n` (estilo UE4), más luna direccional, más 1 spot.
- **Gestor de luces virtuales**: los props registran cientos de fuentes (`B.light(...)`). Cada 0.2 s se puntúan con `i·range/(1+d²/70)`, las 6 mejores ocupan slots y **entran y salen con fade**. Cada fuente tiene **parpadeo** con ruido más seno.

### 4.2 Sombras
- **Linterna del héroe**: **cubemap de distancia R16F** (6 caras, 256 a 1024 según calidad). Solo se re-renderizan los chunks dentro del radio y del frustum de cada cara (por eso la geometría se agrupa en chunks de 16 m). PCF de 5 taps rotados.
- **Spot "ventana"**: shadow map 512² con `sampler2DShadow` (PCF por hardware). Se activa el spot cuyo objetivo está más cerca del jugador.
- Offset de normal (`ps = vW + Ng*.035`) contra el acné.

### 4.3 Pipeline HDR (comentario del autor)
> scene(HDR, reduced-res, nearest) → SSAO → volumetrics → resolve(SSR + haze) → tilt-shift DOF → bloom → filmic tonemap + grade + ordered dither + vignette + grain

1. **Cielo** en un pase aparte: nebulosa con fbm y domain warping, estrellas en 2 capas con parallax y planeta con anillos y scattering de borde.
2. **SSAO** sobre depth lineal: reconstruye la normal desde la depth (eligiendo la diferencia menor para no cruzar bordes), **espiral de Vogel** (ángulo áureo 2.39996) rotada por **interleaved gradient noise**, 4 a 12 taps. Se aplica atenuado en zonas brillantes: `mix(1, ao, 1 - lum*.35)`.
3. **Volumétricos** a media resolución: ray-march de 6 a 16 pasos con jitter IGN dentro de la esfera de la linterna, muestreando el **cubemap de sombra** (haces con sombras). Las demás luces usan **in-scattering analítico cerrado** (`atan` sobre el rayo) más niebla baja fbm en el piso.
4. **Resolve**: **SSR** barato solo para el piso (marcha en dirección vertical de pantalla aprovechando la cámara ortográfica fija), distorsión de **calor** sobre llamas y composición del volumétrico.
5. **DOF tilt-shift**: el CoC crece hacia arriba y abajo de la pantalla y produce la sensación de maqueta o diorama.
6. **Bloom** de 3 a 5 niveles (umbral suave `k²/(k+.6)`, downsample de 4 taps, upsample tent).
7. **Final**: **ACES (Narkowicz)**, saturación dependiente de luminancia (sombras desaturadas, medios más saturados), **split-toning** (sombras azuladas, luces cálidas), acento de color en medios tonos, viñeta, grano animado, **cuantización a 28 niveles con dither Bayer 8×8**. Esto da el look "pixel-art HDR" limpio y sin banding.

### 4.4 Cámara
Ortográfica isométrica (elevación 42°, azimut 45°) con **snap de posición al tamaño de píxel** (`round(a/wpp)*wpp`), que evita el shimmer del render a baja resolución.

---

## 5. Sonido (breve)
WebAudio 100% sintetizado: **buffer de ruido blanco** reutilizable, osciladores, `BiquadFilter` y envolventes. Hay **3 reverbs de convolución con respuestas al impulso generadas en código** (ruido filtrado con decaimiento `(1-t)^p` más reflexiones tempranas aleatorias), elegidas según el tamaño de la sala. Bus con **compresor**, drones ambientales con sub-osciladores y filtros paso banda modulados. El audio se habilita en el primer gesto del usuario.

---

## 6. Rendimiento
- **Batching estático por material y chunk espacial de 16 m** (`ChunkBatcher`): todo el nivel queda en unos pocos draw calls por chunk, con culling por esfera contra el frustum ortográfico y contra cada cara del cubemap de sombra.
- **Batch por material para props rígidos y rigs** (`partsOf`): personajes con jerarquía de huesos donde cada hueso es una malla fusionada.
- **Instancing** (`drawElementsInstanced` con `instanceMatrix`/`instanceColor`) para escombros, partículas y debris.
- **Partículas GPU sin simulación en CPU**: la posición se evalúa en el vertex shader desde `(birth, life, vel, drag, gravity)`. Es un ring buffer.
- **Construcción time-sliced** con generadores `function*` y `yield` cada 16 filas. Las texturas se hornean una por frame.
- **Render a baja resolución** (1/2 a 1/3) con `NEAREST`, y volumétricos a 1/2.
- **Escalador adaptativo de calidad** (5 tiers): mide el tiempo de frame (EMA). Si pasa de 19.5 ms durante más de 1.1 s baja un tier; si queda bajo 17.4 ms durante 6 s sube, con histéresis y "lockout" de 90 s tras un rebote. Cada tier cambia la escala de resolución, los taps de AO, los pasos volumétricos, los taps de DOF, los pasos SSR, el tamaño del cubemap de sombra, los niveles de bloom, la densidad de partículas y la frecuencia de sombras (cada 2 frames en el tier bajo).
- Estado GL cacheado (bitmask de estado, programa, material) y uniforms por frame subidos una sola vez por programa.

---

## 7. Qué aplicar al Campus UAP

Contexto del repo: three.js r187 `WebGPURenderer` con TSL. Los edificios procedurales se generan en `src/world/buildings/BuildingGeometryBuilder.ts`, que hoy produce **quads planos de muro más techo**, todos fusionados por material en `BuildingsBuilder.ts`. La fachada se resuelve en `src/render/materials/nodes/facadeNode.ts`, que **pinta** ventanas, marcos y alféizares en el shader sobre texturas KTX2 descargadas (`TextureLibrary.ts`). El post (`src/render/post/PostPipeline.ts`) ya tiene GTAO y bloom.

La lección central de Voidlight: **la riqueza viene de muchas piezas simples horneadas en pocos batches (kitbash por código), con texturas cuyo normal map deriva de una altura procedural, AO horneado en vértices y un post-proceso cuidado.** No hacen falta CSG ni SDF.

### R1. Un "Kit" de modelado para fachadas (base de todo lo demás)
- **Qué**: portar el patrón `Kit` (`at()`, `tint()`, `box/boxB`, `bar(p0,p1)`, `beam(p0,p1)`, `geo(prim)`) sobre nuestro `GeometryData`. Cada llamada aplica una matriz y hace `appendGeometry` en el batch de su material (`wall:<kind>`, `trim`, `glass`, `frame`, `roof`).
- **Dónde**: nuevo `src/world/buildings/kit/FacadeKit.ts` que use `pushVertex` de `../geometry/GeometryData`. Para normales con escala no uniforme, usar la **matriz de cofactores** (como `appendGeom` de Voidlight) o `Matrix3.getNormalMatrix`.
- **Por qué**: permite escribir `bay.window(...)`, `wall.cornice(...)` y `column(...)` en 3 a 10 líneas cada uno. Mantiene 1 draw call por material.

### R2. Ventanas con hundimiento real (geometría), no solo pintadas
- **Qué**: en lugar de un quad continuo por pared, recorrer el muro por **pisos × vanos** (las mismas constantes `LEVEL=3.2`, `BAY=3.3`, `WIN_W`, `SILL`, `HEAD` de `facadeNode.ts`) y emitir: paños de muro alrededor del hueco, **4 caras de jamba/dintel/alféizar interior** con profundidad de 0.15 a 0.25 m, el vidrio retranqueado, un **alféizar saliente** (`boxB` de 0.05×0.12 que sobresale 0.06 m) y un marco de 4 barras con montante central. Es la "ventana viewport" de Voidlight.
- **Dónde**: `BuildingGeometryBuilder.ts`, dentro de `wallQuad`, que pasaría a ser `wallWithOpenings(g, a, b, y0, y1, …)`. Activarlo solo en paredes con `len >= 2.6` y fuera de gabletes. La máscara de ventanas del shader se elimina para esos muros y la lógica de vidrio, cortinas y encendido nocturno (hash por vano) pasa a un material `glass` que recibe `level` y `bayIdx` como atributo.
- **Detalle**: horneando AO de vértice en las caras interiores de la jamba (0.55 al fondo, 1 en el borde) se obtiene la lectura de profundidad sin depender de GTAO.

### R3. Cornisas, zócalos e impostas como capas de cajas escalonadas
- **Qué**: igual que el zócalo, la cornisa y la pilastra de Voidlight, apilar 2 o 3 bandas con **vuelo creciente** (por ejemplo 0.06, 0.12 y 0.20 m) y alturas de 0.10 a 0.25 m. Van en la base (zócalo de piedra u hormigón), en cada losa (**imposta/línea de piso**, que reemplaza el oscurecimiento `lv<0.16` del shader) y en el coronamiento (cornisa y **albardilla del parapeto** saliente).
- **Dónde**: `FacadeKit.cornice(edgeA, edgeB, y, profile[])`, llamado desde `buildBuildingGeometry` por cada arista del footprint. En las esquinas, extender cada banda `+vuelo` en ambos extremos (o resolver con miter usando el `inset()` existente con `d` negativo) para que las bandas se crucen limpias.
- **Variante de mayor calidad**: extruir un perfil 2D (cyma, cavetto) a lo largo del polígono con `ExtrudeGeometry` y `extrudePath`, o un barrido propio con miter. Las cajas escalonadas bastan a distancia de juego y son más baratas.

### R4. Columnas y elementos torneados con `LatheGeometry`
- **Qué**: perfiles de **basa, fuste con éntasis y capitel** como arrays `[r, y]` (copiar el estilo de `G.column`), y **balaustres** para barandas. Para pórticos y accesos de edificios hero o semi-hero.
- **Dónde**: `src/world/buildings/kit/profiles.ts` (perfiles) más `LatheGeometry` de three, cacheada por perfil y segmentos. Hornearla con el Kit (R1) o, si se repite mucho (barandas, columnatas), usar **`InstancedMesh`** (o `BatchedMesh` de r187) en vez de hornear.
- **Segmentos**: 12 para fustes y 8 para balaustres. Con normales suaves del lathe se ve redondo.

### R5. Ladrillo, revoque y hormigón procedurales en TSL (y quitar descargas)
- **Qué**: reemplazar o complementar las KTX2 de muro con funciones TSL que replican `cell()` de Voidlight: `cellId = floor(uv/brickSize + stagger)`, `edge = min(fract, 1-fract)`, `mortar = smoothstep(0, w, edge)`. El color por ladrillo sale de `hash(cellId)` (en tres tonos de la paleta del edificio), la altura es `mortar*0.5 + fbm*0.3 + microNoise*0.06` y la rugosidad sube en las juntas.
  - **Revoque/estuco**: fbm de baja frecuencia en el albedo, `mx_worley_noise_float` para **descascarado** (umbral sobre F2-F1, que deja ver el ladrillo debajo) y grano fino en la rugosidad.
  - **Hormigón**: marcas de **moldaje** (bandas cada 0.6 a 1.2 m) más **agujeros de amarre** (círculos en grilla, `1 - smoothstep(r0,r1,dist)`) y manchas verticales.
- **Normal**: en TSL, obtener la normal desde la altura con `bumpMap(heightNode, scale)` (disponible en `three/tsl`), o calcular la altura en 3 puntos y armar la normal con diferencias finitas, que es exactamente el `bakeSet` de Voidlight pero en GPU.
- **Dónde**: nuevo `src/render/materials/nodes/proceduralWall.ts` con `brickNodes(params)`, `plasterNodes`, `concreteNodes`. `facadeNodes` elige según `appearance.wallMaterial`. **Alternativa más barata en runtime**: hornear estas funciones una vez a `DataTexture` o `RenderTarget` al arrancar (como el boot de Voidlight, una por frame), con lo que se gana tileabilidad y cero coste por píxel.
- **Requisito**: ruido **periódico** si se hornea (tileable). Las UV de muro ya están en metros, lo que da densidad de texel constante, igual que el `uvS` de Voidlight.

### R6. Desgaste y suciedad dirigidos por la geometría (weathering)
- **Qué**: llevar al shader de fachada las reglas de Voidlight: el óxido y la suciedad se concentran **cerca de bordes y juntas**, y el muro se oscurece en la base. En nuestro caso:
  - **Escurrimientos bajo alféizares y cornisas**: máscara `smoothstep` vertical que nace en `lv = SILL` (debajo de cada ventana) y en la cornisa, modulada por ruido estirado en Y (`noise(vec2(x*8, y*0.6))`).
  - Salpicadura de lluvia en los primeros 0.5 m (ya hay un degradado, sumarle ruido de alta frecuencia más oscuro).
  - Musgo o humedad en orientación sur (hemisferio sur: la cara sur recibe menos sol). Usar `normalWorld.z`.
- **Dónde**: `facadeNode.ts`, después de calcular `wall`. Pasar `edgeDist` (distancia al borde de vano o arista) como atributo horneado desde el builder (R2/R3) para no tener que recalcularla.

### R7. AO horneado en vértices y variación por pieza
- **Qué**: igual que en Voidlight, escribir AO en el color de vértice: base del muro 0.6 a 0.7, encuentro muro-cornisa 0.75, fondo de la jamba 0.55. Sumar un **multiplicador por pieza/vano** `0.92 + hash(id)*0.16` para que no todos los vanos ni todos los paños sean idénticos.
- **Dónde**: el `color` de `pushVertex` (ya se usa para el tinte del edificio). Multiplicar `wallColor` por el AO. GTAO a resolución 0.5 no captura bien huecos de 20 cm a distancia, así que el AO horneado lo complementa a coste cero.

### R8. Detalles de techo y remate: parapetos, mansardas y equipos
- **Qué**: con el Kit, la **albardilla** del parapeto (caja saliente 0.05 m por lado), **gárgolas o bajadas de agua** (`beam` vertical en esquinas, cada 8 a 12 m), **equipos de climatización** (cajas con rejilla pintada usando la receta `grate`), **claraboyas**. En techos inclinados, **tapacan/fascia** (`bar` a lo largo del alero) y una **cumbrera** (caja fina sobre `r1-r2`).
- **Dónde**: `pitchedRoof()` y la rama de techo plano de `buildBuildingGeometry`. Usar un RNG con semilla por `b.id` (mulberry32, como `v4` de Voidlight) para que el resultado sea determinista.

### R9. Charcos y suelo mojado como máscara de rugosidad
- **Qué**: en `groundNodes` y `roadNodes`, una máscara `smoothstep(t, t+0.06, fbm(xz*0.2))` que **baja la rugosidad a unos 0.04**, oscurece el albedo, aplana la normal (`mix(n, normalGeom, puddle)`) y se controla con un uniform `wetness` (lluvia/clima). Con `ssr` de three (`three/addons/tsl/display/SSRNode.js`) solo en tier alto, y sin SSR fuera de él (el entorno PBR ya refleja).
- **Dónde**: `src/render/materials/nodes/surfaceNodes.ts` más un uniform en `sharedUniforms.ts`.

### R10. Grading, luces de ambiente y calidad adaptativa
- **Grading** (es lo que más se nota y lo más barato): en `PostPipeline.ts`, antes del tone mapping, aplicar **saturación dependiente de luminancia**, **split-toning** (sombras +azul `(-.014,-.002,.024)` y luces ×`(1.06,1,.92)`), grano muy suave y **dither** para evitar banding en el cielo. Son unas 6 líneas TSL.
- **Luces "virtuales" para la noche**: registrar cada farol o ventana encendida como fuente y activar solo las N con mejor puntuación (`intensidad·rango/(1+d²/70)`) en un pool fijo de `PointLight`, con fade. El número de luces activas en `WebGPURenderer` no cambia y los shaders no se recompilan.
- **Calidad adaptativa**: copiar la máquina de estados de Voidlight (EMA del frame time, bajar a más de 19.5 ms durante 1.1 s, subir a menos de 17.4 ms durante 6 s, lockout de 90 s) sobre `src/domain/quality/QualityProfiles.ts`. Así se cambian en caliente la escala de GTAO, el bloom y la resolución de sombras.

### Prioridad sugerida
1. R1 (Kit) y R3 (cornisas e impostas): el mayor salto visual por esfuerzo.
2. R2 (ventanas hundidas) y R7 (AO de vértice).
3. R10 (grading): una tarde de trabajo.
4. R5 y R6 (materiales TSL más weathering).
5. R4, R8 y R9 según los edificios del campus que se trabajen.

> Nota de presupuesto: hornear todo en pocos batches por material (como hoy `walls:<kind>`) conserva el número de draw calls. Si la geometría crece mucho (ventanas reales en cientos de edificios), conviene trocear por **chunks espaciales** (Voidlight usa 16 m; para el campus, de 64 a 128 m) para que el frustum culling y las cascadas de sombra descarten trozos. Además, a gran distancia se puede volver a la fachada pintada actual como LOD.
