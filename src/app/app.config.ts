import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { actividadInterceptor } from './core/interceptors/activity-interceptor';
import { cacheBreveInterceptor } from './core/interceptors/cache-interceptor';
import { marcarSentido } from './core/nav-direction';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { sinConexionInterceptor } from './core/offline/offline-interceptor';
import { PrecargaSinConexion } from './core/offline/offline-preload';
import { GlobalErrorHandler } from './core/handlers/error-handler';

const savedLang = localStorage.getItem('lang') ?? 'es';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: marcarSentido }), withPreloading(PrecargaSinConexion)),
    // logging: X-Trace-Id en las llamadas al backend, para cruzar errores con los logs del servidor
    // sinConexion va primero: ve el resultado final (después de renovar el token) y decide si usa la copia o la cola
    // actividad cuenta las llamadas en curso (barra de progreso); cacheBreve va después del token porque guarda por sesión
    provideHttpClient(withInterceptors([actividadInterceptor, sinConexionInterceptor, jwtInterceptor, cacheBreveInterceptor, loggingInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideTranslateService({ lang: savedLang, fallbackLang: 'es' }),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
  ],
};
