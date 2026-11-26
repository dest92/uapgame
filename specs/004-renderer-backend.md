# 004 — Renderer con fallback

- **RND-1** Si `navigator.gpu` existe y se obtiene adaptador → backend WebGPU; si no → WebGL2 (`forceWebGL`).
- **RND-2** `?backend=webgl` fuerza WebGL2 (para test y comparación).
- **RND-3** El backend activo se expone (`'WebGPU' | 'WebGL2'`) y se muestra en el overlay F3.
- **RND-4** Si ningún backend inicializa, la pantalla de carga muestra un error legible.
