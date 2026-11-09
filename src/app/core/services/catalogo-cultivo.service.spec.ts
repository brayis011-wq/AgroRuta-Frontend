import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogoCultivoService } from './catalogo-cultivo.service';
import { environment } from '../../../environments/environment';

describe('CatalogoCultivoService', () => {
  let service: CatalogoCultivoService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/crop-catalog`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CatalogoCultivoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('activos() reads the active catalog', () => {
    service.activos().subscribe();
    expect(http.expectOne(api).request.method).toBe('GET');
  });

  it('crearVariedad() posts the name under the crop', () => {
    service.crearVariedad(4, 'Hass').subscribe();
    const req = http.expectOne(`${api}/types/4/varieties`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Hass' });
  });

  it('estadoVariedad() sends the new state as a query param', () => {
    service.estadoVariedad(9, false).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/varieties/9/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('activo')).toBe('false');
  });
});
