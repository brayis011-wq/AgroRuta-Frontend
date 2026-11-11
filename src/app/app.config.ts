import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { sinConexionInterceptor } from './core/offline/offline-interceptor';
import { PrecargaSinConexion } from './core/offline/offline-preload';
import { GlobalErrorHandler } from './core/handlers/error-handler';

const savedLang = localStorage.getItem('lang') ?? 'es';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true }), withPreloading(PrecargaSinConexion)),
    // logging: X-Trace-Id en las llamadas al backend, para cruzar errores con los logs del servidor
    // sinConexion va primero: ve el resultado final (después de renovar el token) y decide si usa la copia o la cola
    provideHttpClient(withInterceptors([sinConexionInterceptor, jwtInterceptor, loggingInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideTranslateService({ lang: savedLang, fallbackLang: 'es' }),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
  ],
};
