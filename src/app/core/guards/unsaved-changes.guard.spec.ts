import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';
import { ConCambiosSinGuardar, cambiosSinGuardarGuard } from './unsaved-changes.guard';

describe('cambiosSinGuardarGuard', () => {
  const preguntar = vi.fn();
  const correr = (c: ConCambiosSinGuardar) =>
    TestBed.runInInjectionContext(() => cambiosSinGuardarGuard(c, null as never, null as never, null as never));

  beforeEach(() => {
    preguntar.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ConfirmService, useValue: { preguntar } }] });
  });

  it('sin cambios deja salir sin preguntar', () => {
    expect(correr({ tieneCambios: () => false })).toBe(true);
    expect(preguntar).not.toHaveBeenCalled();
  });

  it('con cambios pregunta y obedece la respuesta', async () => {
    preguntar.mockResolvedValue(false);
    expect(await correr({ tieneCambios: () => true })).toBe(false);
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({ peligro: true }));
  });
});
