import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalService } from './portal.service';
import { environment } from '../../../environments/environment';

describe('PortalService', () => {
  let service: PortalService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/portal`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PortalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cargarEstado() keeps the latest state', () => {
    service.cargarEstado().subscribe();
    http.expectOne(`${api}/status`).flush({ estado: 'PENDIENTE', trabajador: null });
    expect(service.estado$.value?.estado).toBe('PENDIENTE');
  });

  it('solicitar() posts the cédula', () => {
    service.solicitar('1052334120').subscribe();
    const req = http.expectOne(`${api}/request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cedula: '1052334120' });
    req.flush({ estado: 'PENDIENTE', trabajador: null });
  });
});
