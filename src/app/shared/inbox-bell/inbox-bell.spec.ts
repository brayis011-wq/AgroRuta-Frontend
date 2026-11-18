import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { CampanaComponent } from './inbox-bell';
import { BandejaAvisosService, CADA_CUANTO_MS } from '../../core/services/inbox.service';
import { environment } from '../../../environments/environment';

const base = `${environment.apiUrl}/api/notifications/inbox`;
const pago = { id: 7, tipo: 'PAGO_REGISTRADO', titulo: 'T', cuerpo: 'C', datos: { monto: '10000' }, ruta: '/portal/payments', creadoEn: new Date().toISOString(), leido: false };
const viejo = { id: 6, tipo: 'ACCESO_SOLICITADO', titulo: 'T', cuerpo: 'C', datos: { trabajador: 'Ana' }, ruta: '/worker', creadoEn: new Date().toISOString(), leido: true };

describe('CampanaComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [CampanaComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  function montar() {
    const fixture = TestBed.createComponent(CampanaComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    http.expectOne(`${base}/unread-count`).flush({ noLeidos: 1 });
    fixture.detectChanges();
    return fixture;
  }

  it('muestra el número de no leídos y vuelve a preguntar cada dos minutos', () => {
    const fixture = montar();
    expect(fixture.nativeElement.querySelector('.globo')?.textContent?.trim()).toBe('1');

    vi.advanceTimersByTime(CADA_CUANTO_MS);
    http.expectOne(`${base}/unread-count`).flush({ noLeidos: 12 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.globo')?.textContent?.trim()).toBe('9+');
    fixture.nativeElement.remove();
  });

  it('al abrir carga la lista; al tocar un aviso lo marca leído y abre su pantalla', () => {
    const fixture = montar();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne(base).flush({ noLeidos: 1, avisos: [pago, viejo] });
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.aviso');
    expect(filas).toHaveLength(2);
    expect(filas[0].classList.contains('nuevo')).toBe(true);
    expect(filas[1].classList.contains('nuevo')).toBe(false);

    (filas[0] as HTMLButtonElement).click();
    const marcar = http.expectOne(`${base}/7/read`);
    expect(marcar.request.method).toBe('PATCH');
    marcar.flush(null);
    fixture.detectChanges();
    expect(navegar).toHaveBeenCalledWith('/portal/payments');
    expect(TestBed.inject(BandejaAvisosService).noLeidos()).toBe(0);
    expect(fixture.nativeElement.querySelector('.panel')).toBeNull();
    fixture.nativeElement.remove();
  });

  it('"marcar todo como leído" y la bandeja vacía', () => {
    const fixture = montar();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne(base).flush({ noLeidos: 1, avisos: [pago] });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.todo') as HTMLButtonElement).click();
    http.expectOne(`${base}/read-all`).flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso.nuevo')).toBeNull();
    expect(fixture.nativeElement.querySelector('.globo')).toBeNull();

    TestBed.inject(BandejaAvisosService).avisos.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.vacio')?.textContent).toContain('inbox.empty');
    fixture.nativeElement.remove();
  });

  it('Esc cierra la lista y devuelve el foco a la campana', () => {
    const fixture = montar();
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    http.expectOne(base).flush({ noLeidos: 0, avisos: [] });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.panel')).toBeNull();
    expect(document.activeElement).toBe(boton);
    fixture.nativeElement.remove();
  });

  it('al desaparecer la campana deja de preguntar y olvida los avisos (cierre de sesión)', () => {
    const fixture = montar();
    fixture.destroy();
    const bandeja = TestBed.inject(BandejaAvisosService);
    expect(bandeja.noLeidos()).toBe(0);
    expect(bandeja.avisos()).toBeNull();
    vi.advanceTimersByTime(CADA_CUANTO_MS * 2);
    http.expectNone(`${base}/unread-count`);
  });
});
