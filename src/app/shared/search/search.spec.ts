import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BuscadorComponent, normalizar } from './search';
import { FincaActivaService } from '../../core/services/active-farm.service';
import { TrabajadorService } from '../../core/services/worker.service';
import { CultivoService } from '../../core/services/crop.service';
import { TranslateService } from '@ngx-translate/core';

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
        {
          provide: CultivoService, useValue: {
            listarLotesPorFinca: () => of([
              { id: 7, nombre: 'Lote Cafetal', estado: 'EN_CULTIVO', fincaId: 1, area: 2 },
              { id: 8, nombre: 'La Vega', estado: 'DISPONIBLE', fincaId: 1, area: 1 },
            ]),
            buscarSiembraPorLote: vi.fn(() => of({ id: 34, tipoCultivo: 'Café', variedad: 'Castillo', loteId: 7 })),
          },
        },
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
    expect(c.resultados()[0]).toMatchObject({ tipo: 'farm', ruta: '/crops/farm/1' });
  });

  it('encuentra lotes de todas las fincas', () => {
    c.escribir('vega');
    expect(c.resultados()[0]).toMatchObject({ tipo: 'plot', titulo: 'La Vega', detalle: 'La Esperanza', ruta: '/crops/plot/8' });
  });

  it('encuentra la siembra en curso por el nombre del cultivo, sin tildes', () => {
    c.escribir('cafe');
    expect(c.resultados()[0]).toMatchObject({
      tipo: 'planting', titulo: 'Café · Castillo', detalle: 'Lote Cafetal · La Esperanza', ruta: '/crops/planting/34',
    });
  });

  it('solo pide la siembra de los lotes en cultivo', () => {
    const cultivo = TestBed.inject(CultivoService) as unknown as { buscarSiembraPorLote: ReturnType<typeof vi.fn> };
    expect(cultivo.buscarSiembraPorLote).toHaveBeenCalledTimes(1);
    expect(cultivo.buscarSiembraPorLote).toHaveBeenCalledWith(7);
  });

  it('encuentra páginas por palabras parecidas ("abono" lleva a la bodega)', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', { inventario: { nav: 'Bodega de insumos' }, search: { keywords: { inventory: 'insumos, abono' } } });
    translate.use('es');
    c.escribir('abono');
    expect(c.resultados()).toEqual([expect.objectContaining({ tipo: 'page', titulo: 'Bodega de insumos', ruta: '/crops/inventory' })]);
  });

  it('los reportes dicen que son reportes', () => {
    c.escribir('layout.nav.reportPayroll');
    expect(c.resultados()[0]).toMatchObject({ ruta: '/reports', query: { tab: 'payroll' }, detalle: 'layout.nav.reports' });
  });

  it('Ctrl+K toggles and Enter opens the highlighted result', () => {
    c.escribir('kevin');
    c.teclas(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(router.navigate).toHaveBeenCalledWith(['/worker/workdays'], { queryParams: { trabajadorId: 5 } });
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
