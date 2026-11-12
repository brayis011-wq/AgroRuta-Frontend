import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReceiptVerifyComponent } from './receipt-verify';
import { ComprobanteService } from '../../core/services/receipt.service';

describe('ReceiptVerifyComponent', () => {
  const servicio = { verificar: vi.fn() };

  function crear(id: string, code: string) {
    TestBed.configureTestingModule({
      imports: [ReceiptVerifyComponent],
      providers: [
        provideRouter([]),
        { provide: ComprobanteService, useValue: servicio },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id, code }) } } },
      ],
    });
    const f = TestBed.createComponent(ReceiptVerifyComponent);
    f.detectChanges();
    return f;
  }

  beforeEach(() => servicio.verificar.mockReset());

  it('muestra el pago cuando el código es válido', () => {
    servicio.verificar.mockReturnValue(of({ numero: 'CP-000012', fechaPago: '2026-10-16', monto: 450000, metodoPago: 'EFECTIVO',
      trabajador: 'Juan Pérez', cedula: '•••• 120', empleador: 'María', periodoInicio: null, periodoFin: null }));
    const f = crear('12', 'abc');
    expect(servicio.verificar).toHaveBeenCalledWith(12, 'abc');
    expect(f.componentInstance.estado()).toBe('valido');
    expect(f.nativeElement.textContent).toContain('CP-000012');
    expect(f.nativeElement.textContent).toContain('Juan Pérez');
  });

  it('un 404 es un comprobante no válido', () => {
    servicio.verificar.mockReturnValue(throwError(() => ({ status: 404 })));
    expect(crear('12', 'malo').componentInstance.estado()).toBe('invalido');
  });

  it('sin respuesta del servidor no dice que es falso: pide reintentar', () => {
    servicio.verificar.mockReturnValue(throwError(() => ({ status: 0 })));
    expect(crear('12', 'abc').componentInstance.estado()).toBe('sinConexion');
  });

  it('un enlace mal formado no llega al servidor', () => {
    expect(crear('x', 'abc').componentInstance.estado()).toBe('invalido');
    expect(servicio.verificar).not.toHaveBeenCalled();
  });
});
