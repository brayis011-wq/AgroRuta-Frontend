import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BuscadorComponent, normalizar } from './buscador';
import { FincaActivaService } from '../../core/services/finca-activa.service';
import { TrabajadorService } from '../../core/services/worker.service';

describe('normalizar', () => {
  it('ignores accents and case', () => expect(normalizar('  Nómina ')).toBe('nomina'));
});

describe('BuscadorComponent', () => {
  let c: BuscadorComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      imports: [BuscadorComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: FincaActivaService, useValue: { fincas: signal([{ id: 1, nombre: 'La Esperanza', ubicacion: 'Ventaquemada' }]) } },
        { provide: TrabajadorService, useValue: { listarTodos: () => of([{ id: 5, nombreCompleto: 'Kevin Pérez', cedula: '1052', cargo: { nombre: 'Recolector' } }]) } },
      ],
    });
    c = TestBed.createComponent(BuscadorComponent).componentInstance;
    c.abrir();
  });

  it('without text shows only pages', () => {
    expect(c.resultados().every((r) => r.tipo === 'page')).toBe(true);
  });

  it('finds farms and workers ignoring accents', () => {
    c.escribir('perez');
    expect(c.resultados().map((r) => r.tipo)).toContain('worker');
    c.escribir('esperanza');
    expect(c.resultados()[0]).toMatchObject({ tipo: 'farm', ruta: '/cultivo/finca/1' });
  });

  it('Ctrl+K toggles and Enter opens the highlighted result', () => {
    c.escribir('kevin');
    c.teclas(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(router.navigate).toHaveBeenCalledWith(['/worker/jornales'], { queryParams: { trabajadorId: 5 } });
    expect(c.abierto()).toBe(false);
    c.atajo(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(c.abierto()).toBe(true);
  });

  it('arrow keys wrap around the list', () => {
    const n = c.resultados().length;
    c.teclas(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(c.indice()).toBe(n - 1);
  });
});
