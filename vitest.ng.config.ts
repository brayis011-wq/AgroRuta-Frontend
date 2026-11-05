import { defineConfig } from 'vitest/config';

// Configuración que usa "ng test" (además de la que arma Angular).
// isolate: cada archivo de pruebas corre en su propio entorno, así una prueba no
// hereda el estado que dejó otra y el resultado no depende del orden en que corren.
export default defineConfig({
  test: {
    isolate: true,
  },
});
