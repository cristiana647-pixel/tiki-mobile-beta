/* whisper.cpp WebAssembly, commit 6e4ab854 (28/09/2026). El audio queda local. */
let resolveRuntime;
const runtimeReady = new Promise((resolve) => { resolveRuntime = resolve; });
const output = [];
var Module = {
  print: (...parts) => output.push(parts.join(" ")),
  printErr: (...parts) => output.push(parts.join(" ")),
  onRuntimeInitialized: () => resolveRuntime(),
};
importScripts("./engine.js");

let instance = 0;
let modelStored = false;
self.onmessage = async (event) => {
  const { type } = event.data;
  try {
    await runtimeReady;
    if (type === "prepare") {
      if (!instance) {
        if (!modelStored) {
          const response = await fetch("./model.bin");
          if (!response.ok) throw new Error("No se pudo cargar el modelo de voz.");
          const bytes = new Uint8Array(await response.arrayBuffer());
          Module.FS_createDataFile("/", "model.bin", bytes, true, true);
          modelStored = true;
        }
        instance = Module.init("model.bin");
        if (!instance) throw new Error("El iPhone no pudo iniciar el modelo de voz.");
      }
      self.postMessage({ type: "prepared" });
    } else if (type === "transcribe") {
      if (!instance) throw new Error("El modelo de voz no está listo.");
      output.length = 0;
      const audio = new Float32Array(event.data.audio);
      const code = Module.full_default(instance, audio, "es", 2, false);
      if (code) throw new Error(`El reconocimiento terminó con error ${code}.`);
      // full_default inicia un hilo y retorna enseguida. Dejar libre el event loop
      // permite que Emscripten inicialice el hilo y entregue sus mensajes.
      const started = Date.now();
      while (!output.some((line) => line.includes("whisper_print_timings:"))) {
        const elapsed = Date.now() - started;
        if (elapsed > 600000) throw new Error("El reconocimiento tardó demasiado.");
        if (elapsed % 5000 < 250) self.postMessage({ type: "progress", seconds: Math.floor(elapsed / 1000) });
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      Module.free(instance);
      instance = 0;
      self.postMessage({ type: "complete", lines: output });
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
