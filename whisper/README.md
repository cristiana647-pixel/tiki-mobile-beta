# Motor de voz local de TIKI móvil

- `model.bin` es `ggml-tiny-q5_1.bin` multilingüe del repositorio
  [ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp).
  Tamaño: 32.152.673 bytes. SHA-1:
  `2827a03e495b1ed3048ef28a6a4620537db4ee51`, idéntico al publicado
  en la ficha oficial. SHA-256:
  `818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7`.
- `engine.js` es el binario WebAssembly de la
  [demostración oficial de whisper.cpp](https://ggml.ai/whisper.cpp/main.js),
  descargado el 29/09/2026. Se corrigió únicamente la ruta usada para crear
  sus hilos internos: al cargarlo desde `worker.js`, esos hilos deben abrir
  `engine.js` y no el envoltorio. SHA-256 del archivo adaptado:
  `5999b69ca38a3b350be30f99a57ddde4531b28fe799d04c3d928711f1cfbee18`.
- `LICENSE` contiene la licencia MIT de whisper.cpp. La ficha del modelo
  también declara MIT.

`worker.js` integra ambos archivos con la app y procesa el audio localmente.
