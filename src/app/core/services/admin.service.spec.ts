import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { environment } from '../../../environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('resumen() should GET /summary', () => {
    service.resumen().subscribe();
    expect(http.expectOne(`${api}/summary`).request.method).toBe('GET');
  });

  it('cambiarEstado() should PATCH the estado with { activo }', () => {
    service.cambiarEstado(3, false).subscribe();
    const req = http.expectOne(`${api}/users/3/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
  });

  it('cambiarRol() should PATCH the rol', () => {
    service.cambiarRol(4, 'Agricultor').subscribe();
    const req = http.expectOne(`${api}/users/4/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ rol: 'Agricultor' });
  });

  it('agricultor() should GET the detail', () => {
    service.agricultor(7).subscribe();
    expect(http.expectOne(`${api}/farmers/7`).request.method).toBe('GET');
  });
});
