import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FincaActivaService } from './finca-activa.service';
import { CultivoService } from './cultivo.service';
import { AuthService } from './auth';

describe('FincaActivaService', () => {
  let fincas: any[];
  function crear() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getUsuario: () => ({ id: 3 }) } },
        { provide: CultivoService, useValue: { listarFincasPorAgricultor: () => of(fincas), listarLotesPorFinca: () => of([{}, {}]) } },
      ],
    });
    return TestBed.inject(FincaActivaService);
  }
  beforeEach(() => localStorage.removeItem('fincaActiva'));

  it('picks the only farm automatically and counts its plots', () => {
    fincas = [{ id: 7, nombre: 'Única' }];
    const s = crear(); s.cargar();
    expect(s.activa()?.id).toBe(7);
    expect(s.lotesActiva()).toBe(2);
  });

  it('keeps "all farms" when there are several and nothing was chosen', () => {
    fincas = [{ id: 2, nombre: 'B' }, { id: 1, nombre: 'A' }];
    const s = crear(); s.cargar();
    expect(s.activa()).toBeNull();
    expect(s.fincas().map((f) => f.nombre)).toEqual(['A', 'B']);
  });

  it('forgets a saved farm that no longer exists', () => {
    localStorage.setItem('fincaActiva', '99');
    fincas = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }];
    const s = crear(); s.cargar();
    expect(s.idActiva()).toBeNull();
    expect(localStorage.getItem('fincaActiva')).toBeNull();
  });

  it('weather falls back to the first farm with coordinates', () => {
    fincas = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B', centroideLat: 5, centroideLng: -73 }];
    const s = crear(); s.cargar();
    expect(s.paraClima()?.id).toBe(2);
  });
});
