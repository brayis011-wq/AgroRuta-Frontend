import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DatosPasos, calcularPrimerosPasos, siguientePaso } from './first-steps';
import { PrimerosPasosComponent } from './first-steps-card';
import { Finca, Lote } from '../../core/models/crop.model';
import { Trabajador } from '../../core/models/worker.model';

const vacio: DatosPasos = { fincas: [], lotes: [], trabajadores: [], jornales: null, nominas: [] };
const finca = { id: 4, nombre: 'El Mirador' } as Finca;
const lote = (id: number, estado: Lote['estado']) => ({ id, nombre: `Lote ${id}`, estado, fincaId: 4, area: 1 }) as Lote;

describe('calcularPrimerosPasos', () => {
  it('una cuenta nueva tiene los cinco pasos por hacer y empieza por la finca', () => {
    const pasos = calcularPrimerosPasos(vacio);
    expect(pasos.map((p) => p.clave)).toEqual(['farm', 'plot', 'planting', 'worker', 'wage']);
    expect(pasos.every((p) => !p.hecho)).toBe(true);
    expect(siguientePaso(pasos)?.ruta).toEqual(['/crops/new-farm']);
  });

  it('con una finca, el lote se crea en esa finca', () => {
    const pasos = calcularPrimerosPasos({ ...vacio, fincas: [finca] });
    expect(pasos[0].hecho).toBe(true);
    expect(siguientePaso(pasos)).toMatchObject({ clave: 'plot', ruta: ['/crops/farm', 4, 'new-plot'] });
  });

  it('con un lote libre, la siembra lleva a ese lote (tiene el botón de sembrar)', () => {
    const pasos = calcularPrimerosPasos({ ...vacio, fincas: [finca], lotes: [lote(7, 'DISPONIBLE')] });
    expect(siguientePaso(pasos)).toMatchObject({ clave: 'planting', ruta: ['/crops/plot', 7] });
  });

  it('un lote en cultivo o en descanso cuenta como siembra hecha', () => {
    expect(calcularPrimerosPasos({ ...vacio, lotes: [lote(1, 'EN_CULTIVO')] })[2].hecho).toBe(true);
    expect(calcularPrimerosPasos({ ...vacio, lotes: [lote(1, 'EN_DESCANSO')] })[2].hecho).toBe(true);
  });

  it('el trabajador abre el formulario de nuevo trabajador', () => {
    const pasos = calcularPrimerosPasos({ ...vacio, fincas: [finca], lotes: [lote(1, 'EN_CULTIVO')] });
    expect(siguientePaso(pasos)).toMatchObject({ clave: 'worker', ruta: ['/worker'], query: { nuevo: 1 } });
  });

  it('cuenta los jornales de este mes o del anterior, o una nómina ya hecha', () => {
    const t = [{ id: 1 } as Trabajador];
    expect(calcularPrimerosPasos({ ...vacio, trabajadores: t, jornales: { mesActual: 0, mesAnterior: 2, trabajadoresHoy: [] } })[4].hecho).toBe(true);
    expect(calcularPrimerosPasos({ ...vacio, trabajadores: t, nominas: [{ estado: 'PAGADA', cantidad: 3, total: 10 }] })[4].hecho).toBe(true);
    expect(calcularPrimerosPasos({ ...vacio, trabajadores: t, nominas: [{ estado: 'PENDIENTE', cantidad: 0, total: 0 }] })[4].hecho).toBe(false);
  });

  it('con todo hecho no hay siguiente paso', () => {
    const pasos = calcularPrimerosPasos({
      fincas: [finca], lotes: [lote(1, 'EN_CULTIVO')], trabajadores: [{ id: 1 } as Trabajador],
      jornales: { mesActual: 5, mesAnterior: 0, trabajadoresHoy: [] }, nominas: [],
    });
    expect(siguientePaso(pasos)).toBeNull();
  });
});

describe('PrimerosPasosComponent', () => {
  function montar(datos: DatosPasos) {
    TestBed.configureTestingModule({
      imports: [PrimerosPasosComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { getUsuario: () => ({ id: 99 }) } }],
    });
    const fixture = TestBed.createComponent(PrimerosPasosComponent);
    fixture.componentRef.setInput('pasos', calcularPrimerosPasos(datos));
    fixture.detectChanges();
    return fixture;
  }

  it('resalta el siguiente paso con su botón y marca los hechos', () => {
    localStorage.clear();
    const fixture = montar({ ...vacio, fincas: [finca] });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('li.hecho')).toHaveLength(1);
    expect(el.querySelector('li.siguiente a.principal')?.getAttribute('href')).toBe('/crops/farm/4/new-plot');
    expect(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');
  });

  it('al ocultarla no vuelve a salir en este navegador', () => {
    localStorage.clear();
    const fixture = montar(vacio);
    (fixture.nativeElement.querySelector('button.ocultar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    expect(localStorage.getItem('primerosPasosOculto:99')).toBe('1');

    TestBed.resetTestingModule();
    const otra = montar(vacio);
    expect(otra.nativeElement.querySelector('section')).toBeNull();
    localStorage.clear();
  });

  it('con todo hecho no se muestra', () => {
    localStorage.clear();
    const fixture = montar({
      fincas: [finca], lotes: [lote(1, 'EN_CULTIVO')], trabajadores: [{ id: 1 } as Trabajador],
      jornales: { mesActual: 1, mesAnterior: 0, trabajadoresHoy: [] }, nominas: [],
    });
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    expect(fixture.nativeElement.classList.contains('oculto')).toBe(true);
  });
});
