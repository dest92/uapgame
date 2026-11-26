# 006 — Movimiento del jugador y cámara

- **MOV-1** Velocidad caminar 1.6 m/s, correr 5.5 m/s, relativas a la orientación de la cámara (yaw).
- **MOV-2** Aceleración suavizada; sin input, desacelera hasta 0.
- **MOV-3** Salto solo con el personaje apoyado; gravedad −9.81 m/s².
- **MOV-4** El personaje rota suavemente hacia la dirección de movimiento.
- **MOV-5** Estado de animación: `idle` / `walk` / `run` / `jump` según velocidad y contacto.
- **CAM-1** Cámara orbital: yaw libre, pitch limitado a [−0.35, 1.2] rad, distancia [1.5, 8] m con zoom.
- **CAM-2** Colisión de cámara: si un raycast desde el objetivo choca, la distancia se acorta al impacto − 0.2 m.
- **CAM-3** La cámara se suaviza (damping) y nunca queda bajo el terreno.

## Notas de implementación
- Estado `jog` (2.4–4.4 m/s) para el joystick analógico a media inclinación; la cadencia de la animación se ajusta a la velocidad real para que los pies no "patinen".
- Personaje: Quaternius Universal Base Characters (CC0) con ropa pintada por shader (región por hueso dominante) y peinado fusionado al esqueleto en el pipeline.
