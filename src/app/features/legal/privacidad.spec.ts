import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacidadComponent } from './privacidad';

describe('PrivacidadComponent', () => {
  const crear = () => {
    TestBed.configureTestingModule({ imports: [PrivacidadComponent], providers: [provideRouter([])] });
    const f = TestBed.createComponent(PrivacidadComponent);
    f.detectChanges();
    return f;
  };
  const enlaceGoogle = 'a[href="https://developers.google.com/terms/api-services-user-data-policy"]';

  afterEach(() => localStorage.removeItem('lang'));

  it('muestra la política con el uso limitado de la API de Gmail', () => {
    const f = crear();
    f.componentInstance.cambiar('es');
    f.detectChanges();
    const texto = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Política de privacidad');
    expect(texto).toContain('API de Gmail');
    expect(f.nativeElement.querySelector(enlaceGoogle)).not.toBeNull();
  });

  it('en inglés muestra la traducción, el aviso de que rige la versión en español y el mismo enlace de Google', () => {
    const f = crear();
    f.componentInstance.cambiar('en');
    f.detectChanges();
    const texto = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Privacy policy');
    expect(texto).toContain('Limited Use requirements');
    expect(texto).toContain('The Spanish version is the one that applies');
    expect(f.nativeElement.querySelector(enlaceGoogle)).not.toBeNull();
  });
});
