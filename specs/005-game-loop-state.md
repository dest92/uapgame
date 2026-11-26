# 005 — Loop, estado, eventos e input

- **LOOP-1** La simulación avanza a paso fijo (60 Hz) con acumulador; el render recibe `alpha` de interpolación.
- **LOOP-2** Un frame largo (> 250 ms) se recorta para evitar la "espiral de la muerte".
- **STATE-1** `GameState` guarda entidades serializables (id, tipo, posición, rotación, animación) sin referencias a Three/Rapier.
- **STATE-2** `snapshot()` devuelve un objeto JSON-serializable apto para red (futuro Colyseus).
- **EVT-1** `EventBus` tipado: `on/off/emit`, `on` devuelve función de desuscripción.
- **INP-1** El input se abstrae en acciones (`moveX`, `moveY`, `run`, `jump`, `interact`, `lookDX`, `lookDY`, `zoom`) combinando fuentes (teclado/mouse, táctil).
- **INP-2** El vector de movimiento se normaliza (diagonal no es más rápida).
