import { ApplicationConfig, ErrorHandler } from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withPreloading,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { TituloEstrategia } from './core/services/page-title.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateCompiler, provideTranslateService } from '@ngx-translate/core';
import { CompiladorPlurales } from './core/plural-compiler';
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
import { idiomaGuardado } from './core/services/language.service';

const savedLang = idiomaGuardado();

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: marcarSentido }),
      withPreloading(PrecargaSinConexion),
      // Los formularios que se abren en un panel (rutas hijas) leen el id de la siembra de la ruta madre
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // logging: X-Trace-Id en las llamadas al backend, para cruzar errores con los logs del servidor
    // sinConexion va primero: ve el resultado final (después de renovar el token) y decide si usa la copia o la cola
    // actividad cuenta las llamadas en curso (barra de progreso); cacheBreve va después del token porque guarda por sesión
    provideHttpClient(
      withInterceptors([
        actividadInterceptor,
        sinConexionInterceptor,
        jwtInterceptor,
        cacheBreveInterceptor,
        loggingInterceptor,
      ]),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Título de la pestaña por pantalla ("Nóminas · AgroRuta"), traducido
    { provide: TitleStrategy, useClass: TituloEstrategia },
    // compiler: "1 lote" / "3 lotes" sin repetir la condición en cada pantalla (ver plural-compiler.ts)
    provideTranslateService({
      lang: savedLang,
      fallbackLang: 'es',
      compiler: provideTranslateCompiler(CompiladorPlurales),
    }),
    ...provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
  ],
};
