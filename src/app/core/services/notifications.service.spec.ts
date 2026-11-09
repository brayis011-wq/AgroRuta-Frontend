import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificacionesService } from './notifications.service';
import { environment } from '../../../environments/environment';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/api/notifications/preferences`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtener() hace GET a las preferencias', () => {
    let res: unknown;
    service.obtener().subscribe((r) => (res = r));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({ alertasCultivo: true, avisosTrabajadores: false });
    expect(res).toEqual({ alertasCultivo: true, avisosTrabajadores: false });
  });

  it('guardar() hace PUT con las dos opciones', () => {
    service.guardar({ alertasCultivo: false, avisosTrabajadores: true }).subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ alertasCultivo: false, avisosTrabajadores: true });
    req.flush({ alertasCultivo: false, avisosTrabajadores: true });
  });
});
