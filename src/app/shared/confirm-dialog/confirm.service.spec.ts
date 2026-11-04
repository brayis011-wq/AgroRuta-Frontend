import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  let service: ConfirmService;

  beforeEach(() => {
    service = TestBed.inject(ConfirmService);
  });

  it('resolves true when the user confirms', async () => {
    const respuesta = service.preguntar({ mensaje: '¿Anular?' });
    expect(service.pendiente()?.mensaje).toBe('¿Anular?');
    service.responder(true);
    await expect(respuesta).resolves.toBe(true);
    expect(service.pendiente()).toBeNull();
  });

  it('resolves false when the user cancels', async () => {
    const respuesta = service.preguntar({ mensaje: '¿Anular?' });
    service.responder(false);
    await expect(respuesta).resolves.toBe(false);
  });

  it('cancels the previous question when a new one opens', async () => {
    const primera = service.preguntar({ mensaje: 'Primera' });
    service.preguntar({ mensaje: 'Segunda' });
    await expect(primera).resolves.toBe(false);
    expect(service.pendiente()?.mensaje).toBe('Segunda');
  });
});
