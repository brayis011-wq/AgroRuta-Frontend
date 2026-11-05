import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacidadComponent } from './privacidad';

describe('PrivacidadComponent', () => {
  it('muestra la política con el uso limitado de la API de Gmail', () => {
    TestBed.configureTestingModule({ imports: [PrivacidadComponent], providers: [provideRouter([])] });
    const f = TestBed.createComponent(PrivacidadComponent);
    f.detectChanges();
    const texto = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Política de privacidad');
    expect(texto).toContain('API de Gmail');
    expect(f.nativeElement.querySelector('a[href="https://developers.google.com/terms/api-services-user-data-policy"]')).not.toBeNull();
  });
});
