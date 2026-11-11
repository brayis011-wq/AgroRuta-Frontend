import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PushToggleComponent } from './push-toggle';
import { AvisosPushService } from '../../../core/services/push.service';

describe('PushToggleComponent', () => {
  const push = { estado: vi.fn(), activar: vi.fn(), desactivar: vi.fn(), probar: vi.fn() };

  async function crear() {
    TestBed.configureTestingModule({
      imports: [PushToggleComponent],
      providers: [{ provide: AvisosPushService, useValue: push }],
    });
    const f = TestBed.createComponent(PushToggleComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  afterEach(() => vi.clearAllMocks());

  it('si el navegador no tiene avisos, el interruptor queda apagado y deshabilitado', async () => {
    push.estado.mockResolvedValue('no-soportado');
    const f = await crear();
    const interruptor = f.nativeElement.querySelector('input[role="switch"]') as HTMLInputElement;
    expect(interruptor.disabled).toBe(true);
    expect(interruptor.checked).toBe(false);
    expect(f.nativeElement.querySelector('.btn')).toBeNull();
  });

  it('activar suscribe este dispositivo y ofrece mandar una prueba', async () => {
    push.estado.mockResolvedValue('inactivo');
    push.activar.mockResolvedValue('activo');
    const f = await crear();
    await f.componentInstance.cambiar(true);
    f.detectChanges();
    expect(push.activar).toHaveBeenCalled();
    expect(f.componentInstance.estado()).toBe('activo');
    expect(f.componentInstance.mensaje()).toEqual({ texto: 'config.push.enabled', error: false });
    expect(f.nativeElement.querySelector('.btn')).toBeTruthy();
  });

  it('si la persona niega el permiso, lo explica', async () => {
    push.estado.mockResolvedValue('inactivo');
    push.activar.mockResolvedValue('bloqueado');
    const c = (await crear()).componentInstance;
    await c.cambiar(true);
    expect(c.estado()).toBe('bloqueado');
    expect(c.mensaje()?.error).toBe(true);
  });

  it('si activar falla, vuelve al estado real y avisa', async () => {
    push.estado.mockResolvedValue('inactivo');
    push.activar.mockRejectedValue(new Error('x'));
    const c = (await crear()).componentInstance;
    await c.cambiar(true);
    expect(c.estado()).toBe('inactivo');
    expect(c.mensaje()).toEqual({ texto: 'config.push.error', error: true });
    expect(c.ocupado()).toBe(false);
  });

  it('desactivar quita la suscripción', async () => {
    push.estado.mockResolvedValue('activo');
    push.desactivar.mockResolvedValue('inactivo');
    const c = (await crear()).componentInstance;
    await c.cambiar(false);
    expect(push.desactivar).toHaveBeenCalled();
    expect(c.estado()).toBe('inactivo');
  });

  it('la prueba dice si llegó a algún dispositivo', async () => {
    push.estado.mockResolvedValue('activo');
    const c = (await crear()).componentInstance;

    push.probar.mockResolvedValue(1);
    await c.probar();
    expect(c.mensaje()).toEqual({ texto: 'config.push.testSent', error: false });

    push.probar.mockResolvedValue(0);
    await c.probar();
    expect(c.mensaje()).toEqual({ texto: 'config.push.testFailed', error: true });
  });
});
