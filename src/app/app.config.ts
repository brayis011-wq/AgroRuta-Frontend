import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { GlobalErrorHandler } from './core/handlers/error.handler';

const savedLang = localStorage.getItem('lang') ?? 'es';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideTranslateService({ lang: savedLang, fallbackLang: 'es' }),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
  ],
};
