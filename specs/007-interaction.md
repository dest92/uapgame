# 007 — Interacción con edificios

- **INT-1** Si el jugador está a < 4 m de la entrada de un edificio, ese edificio es el "objetivo" (el más cercano si hay varios).
- **INT-2** Con objetivo, la UI muestra el hint "E — Ver <nombre>" (o "Tocar" en táctil).
- **INT-3** Al interactuar se abre el panel con los datos de `data/buildings-info.json`; Esc/tap cierra.
- **INT-4** `buildings-info.json` se genera desde OSM + referencias y **preserva ediciones manuales** (campos con `"manual": true` o no generados no se pisan).
- **INT-5** Cada dato del panel cita su origen (`source`: "OSM way/…", URL de referencia, "manual").
- **INT-6** Mientras el panel está abierto el jugador no se mueve.
