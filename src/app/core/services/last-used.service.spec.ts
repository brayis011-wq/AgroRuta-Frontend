import { TestBed } from '@angular/core/testing';
import { UltimoUsadoService } from './last-used.service';

describe('UltimoUsadoService', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y lee lo último de cada formulario', () => {
    const s = TestBed.inject(UltimoUsadoService);
    expect(s.leer('cosecha')).toBeNull();
    s.guardar('cosecha', { precioKg: 9500 });
    expect(s.leer<{ precioKg: number }>('cosecha')?.precioKg).toBe(9500);
  });

  it('mezcla por partes: la dosis de cada producto queda aparte', () => {
    const s = TestBed.inject(UltimoUsadoService);
    s.mezclar('fumigacion', { 3: { dosis: 2 } });
    s.mezclar('fumigacion', { 8: { dosis: 1.5 } });
    expect(s.leer<Record<string, { dosis: number }>>('fumigacion')).toEqual({ 3: { dosis: 2 }, 8: { dosis: 1.5 } });
  });
});
