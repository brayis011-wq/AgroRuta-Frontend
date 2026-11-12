import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVISO_SALIDA_MS, AVISO_VISIBLE_MS, AvisosService } from './toast.service';

describe('AvisosService', () => {
  let avisos: AvisosService;

  beforeEach(() => {
    vi.useFakeTimers();
    avisos = new AvisosService();
  });

  afterEach(() => vi.useRealTimers());

  it('muestra el aviso y lo retira solo', () => {
    avisos.exito('avisos.harvest', { n: 1 });
    expect(avisos.actual()).toMatchObject({ clave: 'avisos.harvest', params: { n: 1 } });

    vi.advanceTimersByTime(AVISO_VISIBLE_MS);
    expect(avisos.saliendo()).toBe(true);
    expect(avisos.actual()).not.toBeNull();

    vi.advanceTimersByTime(AVISO_SALIDA_MS);
    expect(avisos.actual()).toBeNull();
    expect(avisos.saliendo()).toBe(false);
  });

  it('un aviso nuevo reemplaza al anterior y empieza su tiempo de cero', () => {
    avisos.exito('avisos.activity');
    const primero = avisos.actual()!.id;
    vi.advanceTimersByTime(AVISO_VISIBLE_MS - 100);

    avisos.exito('avisos.wage');
    expect(avisos.actual()!.id).not.toBe(primero);
    vi.advanceTimersByTime(200);
    expect(avisos.saliendo()).toBe(false);
    expect(avisos.actual()!.clave).toBe('avisos.wage');
  });

  it('se puede cerrar antes de tiempo', () => {
    avisos.exito('avisos.saved');
    avisos.cerrar();
    expect(avisos.saliendo()).toBe(true);
    vi.advanceTimersByTime(AVISO_SALIDA_MS);
    expect(avisos.actual()).toBeNull();

    avisos.cerrar();   // sin aviso no hace nada
    expect(avisos.saliendo()).toBe(false);
  });
});
