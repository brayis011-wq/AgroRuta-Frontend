import { beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

/**
 * Las pruebas de componentes usan el pipe/servicio de traducción (ngx-translate).
 * Se lo damos a todas para que no fallen con "No provider found for TranslateService".
 */
const aplicarTraduccion = () =>
  TestBed.configureTestingModule({
    providers: [provideTranslateService({ lang: 'es', fallbackLang: 'es' })],
  });

// Algunas pruebas llaman a TestBed.resetTestingModule() dentro de sus propios helpers,
// lo cual borraría el proveedor global: lo volvemos a aplicar después de cada reset.
const resetOriginal = TestBed.resetTestingModule.bind(TestBed);
TestBed.resetTestingModule = () => {
  const resultado = resetOriginal();
  aplicarTraduccion();
  return resultado;
};

beforeEach(() => {
  aplicarTraduccion();
});
