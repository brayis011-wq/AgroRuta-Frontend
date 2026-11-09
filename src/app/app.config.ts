import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { GlobalErrorHandler } from './core/handlers/error-handler';

const savedLang = localStorage.getItem('lang') ?? 'es';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    // logging: X-Trace-Id en las llamadas al backend, para cruzar errores con los logs del servidor
    provideHttpClient(withInterceptors([jwtInterceptor, loggingInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideTranslateService({ lang: savedLang, fallbackLang: 'es' }),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
  ],
};
