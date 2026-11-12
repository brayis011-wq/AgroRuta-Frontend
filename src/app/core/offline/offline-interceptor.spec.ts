import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { sinConexionInterceptor } from './offline-interceptor';
import { CABECERA_ENVIO, ColaSinConexionService } from './offline-queue.service';
import { AlmacenEnMemoria, AlmacenSinConexion } from './offline-store';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Deja correr las promesas del almacén */
const esperar = () => new Promise((r) => setTimeout(r));
const sinRed = () => new ProgressEvent('error');

describe('sinConexionInterceptor', () => {
  const api = `${environment.apiUrl}/api`;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let cola: ColaSinConexionService;
  let usuario: { id: number } | null;

  beforeEach(() => {
    usuario = { id: 5 };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sinConexionInterceptor])),
        provideHttpClientTesting(),
        { provide: AlmacenSinConexion, useClass: AlmacenEnMemoria },
        { provide: AuthService, useValue: { getUsuario: () => usuario } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    cola = TestBed.inject(ColaSinConexionService);
    cola.enLinea.set(true);
  });

  afterEach(() => httpMock.verify());

  it('con red, el registro viaja con su clave de envío y no queda en la cola', async () => {
    let respuesta: unknown;
    http.post(`${api}/harvests`, { cantidad: 10 }).subscribe((r) => (respuesta = r));
    const req = httpMock.expectOne(`${api}/harvests`);
    expect(req.request.headers.get(CABECERA_ENVIO)).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    req.flush({ id: 1 });
    await esperar();
    expect(respuesta).toEqual({ id: 1 });
    expect(cola.pendientes()).toEqual([]);
  });

  it('sin conexión, guarda el registro en el dispositivo y responde como pendiente', async () => {
    cola.enLinea.set(false);
    let respuesta: HttpResponse<unknown> | undefined;
    http.post(`${api}/workdays`, { trabajadorId: 3 }, { observe: 'response' }).subscribe((r) => (respuesta = r));
    await esperar();
    httpMock.expectNone(`${api}/workdays`);
    expect(respuesta?.status).toBe(202);
    expect(respuesta?.body).toEqual({ pendiente: true });
    expect(cola.pendientes().length).toBe(1);
    expect(cola.pendientes()[0]).toMatchObject({ tipo: 'jornal', usuarioId: 5, url: `${api}/workdays`, cuerpo: { trabajadorId: 3 } });
    expect(cola.guardados()).toBe(1);
  });

  it('si la red se cae a mitad del envío, lo guarda con la misma clave que ya viajó', async () => {
    let respuesta: unknown;
    http.post(`${api}/sprayings`, { producto: 'x' }).subscribe((r) => (respuesta = r));
    const req = httpMock.expectOne(`${api}/sprayings`);
    const clave = req.request.headers.get(CABECERA_ENVIO);
    req.error(sinRed());
    await esperar();
    expect(respuesta).toEqual({ pendiente: true });
    expect(cola.pendientes()[0].id).toBe(clave);
    expect(cola.pendientes()[0].tipo).toBe('fumigacion');
  });

  it('un rechazo del servidor (422) llega a la pantalla y no se encola', async () => {
    let error: { status: number } | undefined;
    http.post(`${api}/harvests`, {}).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/harvests`).flush({ errorCode: 'AGR-012' }, { status: 422, statusText: 'x' });
    await esperar();
    expect(error?.status).toBe(422);
    expect(cola.pendientes()).toEqual([]);
  });

  it('lo que no es un registro de campo no se encola aunque no haya red', async () => {
    cola.enLinea.set(false);
    let error: { status: number } | undefined;
    http.post(`${api}/payments`, {}).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/payments`).error(sinRed());
    await esperar();
    expect(error?.status).toBe(0);
    expect(cola.pendientes()).toEqual([]);
  });

  it('sin sesión no guarda nada: devuelve el error de red', async () => {
    usuario = null;
    cola.enLinea.set(false);
    let error: { status: number } | undefined;
    http.post(`${api}/harvests`, {}).subscribe({ error: (e) => (error = e) });
    await esperar();
    expect(error?.status).toBe(0);
  });

  it('guarda copia de las consultas y la devuelve cuando no hay red', async () => {
    http.get(`${api}/farms`).subscribe();
    httpMock.expectOne(`${api}/farms`).flush([{ id: 1, nombre: 'La Esperanza' }]);
    await esperar();
    expect(cola.copiaDesde()).toBeNull();

    let copia: unknown;
    http.get(`${api}/farms`).subscribe((r) => (copia = r));
    httpMock.expectOne(`${api}/farms`).error(sinRed());
    await esperar();
    expect(copia).toEqual([{ id: 1, nombre: 'La Esperanza' }]);
    expect(cola.copiaDesde()).not.toBeNull();
  });

  it('la copia es de cada cuenta: otra persona en el mismo dispositivo no la ve', async () => {
    http.get(`${api}/farms`).subscribe();
    httpMock.expectOne(`${api}/farms`).flush([{ id: 1 }]);
    await esperar();

    usuario = { id: 6 };
    let error: { status: number } | undefined;
    http.get(`${api}/farms`).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/farms`).error(sinRed());
    await esperar();
    expect(error?.status).toBe(0);
  });

  it('no copia consultas de sesión ni de seguridad', async () => {
    http.get(`${api}/auth/sessions`).subscribe();
    httpMock.expectOne(`${api}/auth/sessions`).flush([{ id: 1 }]);
    await esperar();

    let error: { status: number } | undefined;
    http.get(`${api}/auth/sessions`).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/auth/sessions`).error(sinRed());
    await esperar();
    expect(error?.status).toBe(0);
  });

  it('un error del servidor en una consulta no se tapa con la copia', async () => {
    http.get(`${api}/farms`).subscribe();
    httpMock.expectOne(`${api}/farms`).flush([{ id: 1 }]);
    await esperar();

    let error: { status: number } | undefined;
    http.get(`${api}/farms`).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne(`${api}/farms`).flush('x', { status: 500, statusText: 'x' });
    await esperar();
    expect(error?.status).toBe(500);
  });

  it('las peticiones a otros servicios no se tocan', () => {
    http.get('https://nominatim.openstreetmap.org/search?q=x').subscribe();
    const req = httpMock.expectOne('https://nominatim.openstreetmap.org/search?q=x');
    expect(req.request.headers.has(CABECERA_ENVIO)).toBe(false);
    req.flush([]);
  });
});
