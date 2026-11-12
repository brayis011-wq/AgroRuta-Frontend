import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TwoFactorComponent } from './two-factor';
import { SeguridadService } from '../../../core/services/security.service';

describe('TwoFactorComponent', () => {
  const seguridad = { estado: vi.fn(), preparar: vi.fn(), activar: vi.fn(), desactivar: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [TwoFactorComponent],
      providers: [{ provide: SeguridadService, useValue: seguridad }],
    });
    const f = TestBed.createComponent(TwoFactorComponent);
    f.detectChanges();
    return f;
  }

  afterEach(() => vi.clearAllMocks());

  it('desactivada: ofrece activarla', () => {
    seguridad.estado.mockReturnValue(of({ activo: false, codigosRespaldo: 0 }));
    const f = crear();
    expect(f.nativeElement.querySelector('.estado-chip').classList.contains('on')).toBe(false);
    expect(f.nativeElement.querySelector('.btn-prim')).toBeTruthy();
  });

  it('recorre el alta: contraseña, QR, código y códigos de respaldo', () => {
    seguridad.estado.mockReturnValue(of({ activo: false, codigosRespaldo: 0 }));
    seguridad.preparar.mockReturnValue(of({ secreto: 'ABCDEFGHIJKLMNOP', uri: 'otpauth://totp/x', qr: 'data:image/svg+xml;base64,AAAA' }));
    seguridad.activar.mockReturnValue(of({ codigosRespaldo: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] }));
    const f = crear();
    const c = f.componentInstance;

    c.ir('clave');
    c.password = 'secreta123';
    c.preparar();
    expect(seguridad.preparar).toHaveBeenCalledWith('secreta123');
    expect(c.paso()).toBe('qr');
    expect(c.password).toBe('');
    expect(c.secretoLegible).toBe('ABCD EFGH IJKL MNOP');
    f.detectChanges();
    expect(f.nativeElement.querySelector('img.qr').getAttribute('src')).toContain('data:image/svg+xml');

    c.codigo = ' 123456 ';
    c.activar();
    expect(seguridad.activar).toHaveBeenCalledWith('123456');
    expect(c.paso()).toBe('codigos');
    expect(c.estado()).toEqual({ activo: true, codigosRespaldo: 2 });
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.codigos li').length).toBe(2);

    c.ir('inicio');
    expect(c.codigos()).toEqual([]);
    expect(c.preparacion()).toBeNull();
  });

  it('contraseña incorrecta: se queda en el paso y avisa', () => {
    seguridad.estado.mockReturnValue(of({ activo: false, codigosRespaldo: 0 }));
    seguridad.preparar.mockReturnValue(throwError(() => ({ status: 422, error: { errorCode: 'AGR-011' } })));
    const c = crear().componentInstance;
    c.ir('clave');
    c.password = 'mala';
    c.preparar();
    expect(c.paso()).toBe('clave');
    expect(c.error()).toBe('config.twoFactor.wrongPassword');
  });

  it('código incorrecto al activar: lo borra y avisa', () => {
    seguridad.estado.mockReturnValue(of({ activo: false, codigosRespaldo: 0 }));
    seguridad.activar.mockReturnValue(throwError(() => ({ status: 422, error: { errorCode: 'AGR-035' } })));
    const c = crear().componentInstance;
    c.paso.set('qr');
    c.codigo = '000000';
    c.activar();
    expect(c.codigo).toBe('');
    expect(c.error()).toBe('config.twoFactor.wrongCode');
    expect(c.paso()).toBe('qr');
  });

  it('desactivar: distingue el código malo de la contraseña mala', () => {
    seguridad.estado.mockReturnValue(of({ activo: true, codigosRespaldo: 8 }));
    const c = crear().componentInstance;
    c.ir('quitar');

    seguridad.desactivar.mockReturnValue(throwError(() => ({ status: 422, error: { errorCode: 'AGR-035' } })));
    c.password = 'secreta123';
    c.codigo = '111111';
    c.desactivar();
    expect(c.error()).toBe('config.twoFactor.wrongCode');

    seguridad.desactivar.mockReturnValue(throwError(() => ({ status: 422, error: { errorCode: 'AGR-011' } })));
    c.codigo = '222222';
    c.desactivar();
    expect(c.error()).toBe('config.twoFactor.wrongPassword');

    seguridad.desactivar.mockReturnValue(of(undefined));
    c.codigo = '333333';
    c.desactivar();
    expect(seguridad.desactivar).toHaveBeenLastCalledWith('secreta123', '333333');
    expect(c.estado()).toEqual({ activo: false, codigosRespaldo: 0 });
    expect(c.paso()).toBe('inicio');
  });

  it('si no se puede consultar, no muestra botones', () => {
    seguridad.estado.mockReturnValue(throwError(() => ({ status: 0 })));
    const f = crear();
    expect(f.nativeElement.querySelector('.btn')).toBeNull();
    expect(f.nativeElement.querySelector('.aviso')).toBeTruthy();
  });
});
