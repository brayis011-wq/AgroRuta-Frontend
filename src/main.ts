import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registrarServiceWorker } from './app/core/offline/offline-preload';
import { environment } from './environments/environment';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// Guarda los archivos de la app para poder abrirla sin señal (public/sw.js)
registrarServiceWorker(environment.production);
