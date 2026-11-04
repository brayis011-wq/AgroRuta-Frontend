import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GeocodingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('buscar() returns the first result as numbers', () => {
    let punto: any;
    service.buscar(' Ventaquemada ').subscribe((p) => (punto = p));
    const req = http.expectOne((r) => r.url.endsWith('/search'));
    expect(req.request.params.get('q')).toBe('Ventaquemada');
    req.flush([{ lat: '5.36', lon: '-73.52' }]);
    expect(punto).toEqual({ lat: 5.36, lng: -73.52 });
  });

  it('buscar() returns null when nothing is found', () => {
    let punto: any = 'sin respuesta';
    service.buscar('xyz').subscribe((p) => (punto = p));
    http.expectOne((r) => r.url.endsWith('/search')).flush([]);
    expect(punto).toBeNull();
  });

  it('buscar() returns null when the network fails', () => {
    let punto: any = 'sin respuesta';
    service.buscar('Tunja').subscribe((p) => (punto = p));
    http.expectOne((r) => r.url.endsWith('/search')).error(new ProgressEvent('error'));
    expect(punto).toBeNull();
  });

  it('direccion() joins village, municipality and department', () => {
    let texto: any;
    service.direccion({ lat: 5.36, lng: -73.52 }).subscribe((t) => (texto = t));
    http.expectOne((r) => r.url.endsWith('/reverse'))
      .flush({ address: { village: 'El Salitre', county: 'Ventaquemada', state: 'Boyacá' } });
    expect(texto).toBe('El Salitre, Ventaquemada, Boyacá');
  });
});
