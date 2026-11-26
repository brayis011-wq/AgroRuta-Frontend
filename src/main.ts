import { bootstrapApplication } from '@angular/platform-browser';
import { config as rxjsConfig } from 'rxjs';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registrarServiceWorker } from './app/core/offline/offline-preload';
import { esSinRedNoAtendido } from './app/core/offline/offline-errors';
import { environment } from './environments/environment';

// Sin señal es normal que una consulta falle (p. ej. renovar la sesión) aunque la pantalla no lo atienda:
// no se reporta como error sin capturar. Cualquier otro error sigue igual que siempre.
rxjsConfig.onUnhandledError = (error: unknown) => {
  if (esSinRedNoAtendido(error)) return;
  setTimeout(() => {
    throw error;
  });
};

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Guarda los archivos de la app para poder abrirla sin señal (public/sw.js)
registrarServiceWorker(environment.production);
