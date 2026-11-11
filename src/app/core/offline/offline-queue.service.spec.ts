import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CABECERA_ENVIO, ColaSinConexionService } from './offline-queue.service';
import { AlmacenEnMemoria, AlmacenSinConexion } from './offline-store';
import { AuthService } from '../services/auth.service';

const esperar = () => new Promise((r) => setTimeout(r));

describe('ColaSinConexionService', () => {
  let cola: ColaSinConexionService;
  let httpMock: HttpTestingController;
  let usuario: { id: number } | null;

  beforeEach(() => {
    usuario = { id: 5 };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AlmacenSinConexion, useClass: AlmacenEnMemoria },
        { provide: AuthService, useValue: { getUsuario: () => usuario } },
      ],
    });
    cola = TestBed.inject(ColaSinConexionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía lo pendiente en orden, con su clave, y lo saca de la cola', async () => {
    await cola.encolar('cosecha', '/api/harvests', { cantidad: 10 }, 'clave-0001');
    await esperar();
    await cola.encolar('jornal', '/api/workdays', { trabajadorId: 3 }, 'clave-0002');
    expect(cola.porEnviar()).toBe(2);

    const fin = cola.sincronizar();
    await esperar();
    const primera = httpMock.expectOne('/api/harvests');
    expect(primera.request.headers.get(CABECERA_ENVIO)).toBe('clave-0001');
    expect(primera.request.body).toEqual({ cantidad: 10 });
    primera.flush({ id: 1 });
    await esperar();
    httpMock.expectOne('/api/workdays').flush({ id: 2 });
    await fin;

    expect(cola.pendientes()).toEqual([]);
    expect(cola.enviados()).toBe(2);
    expect(cola.sincronizando()).toBe(false);
  });

  it('si el servidor dice que ya lo había recibido (409 AGR-036), lo da por enviado', async () => {
    await cola.encolar('cosecha', '/api/harvests', {}, 'clave-0001');
    const fin = cola.sincronizar();
    await esperar();
    httpMock.expectOne('/api/harvests').flush({ errorCode: 'AGR-036' }, { status: 409, statusText: 'x' });
    await fin;
    expect(cola.pendientes()).toEqual([]);
    expect(cola.enviados()).toBe(1);
  });

  it('un rechazo por regla de negocio se queda marcado y no frena lo demás', async () => {
    await cola.encolar('cosecha', '/api/harvests', { cantidad: 1 }, 'clave-0001');
    await esperar();
    await cola.encolar('jornal', '/api/workdays', {}, 'clave-0002');

    const fin = cola.sincronizar();
    await esperar();
    httpMock.expectOne('/api/harvests').flush({ errorCode: 'AGR-012', message: 'Faltan 3 días de carencia' }, { status: 422, statusText: 'x' });
    await esperar();
    httpMock.expectOne('/api/workdays').flush({ id: 2 });
    await fin;

    expect(cola.pendientes().length).toBe(1);
    expect(cola.pendientes()[0]).toMatchObject({ id: 'clave-0001', error: 'Faltan 3 días de carencia', codigoError: 'AGR-012' });
    expect(cola.conError()).toBe(1);
    expect(cola.porEnviar()).toBe(0);

    // Lo rechazado no se reenvía solo
    await cola.sincronizar();
    httpMock.expectNone('/api/harvests');
  });

  it('reintentar con cambios (confirmar la carencia) limpia el error y lo vuelve a mandar', async () => {
    await cola.encolar('cosecha', '/api/harvests', { cantidad: 1, confirmarCarencia: false }, 'clave-0001');
    let fin = cola.sincronizar();
    await esperar();
    httpMock.expectOne('/api/harvests').flush({ errorCode: 'AGR-012', message: 'x' }, { status: 422, statusText: 'x' });
    await fin;

    fin = cola.reintentar('clave-0001', { confirmarCarencia: true });
    await esperar();
    const req = httpMock.expectOne('/api/harvests');
    expect(req.request.body).toEqual({ cantidad: 1, confirmarCarencia: true });
    req.flush({ id: 9 });
    await fin;
    expect(cola.pendientes()).toEqual([]);
  });

  it('si sigue sin red se detiene y deja todo en la cola', async () => {
    await cola.encolar('cosecha', '/api/harvests', {}, 'clave-0001');
    await esperar();
    await cola.encolar('jornal', '/api/workdays', {}, 'clave-0002');

    const fin = cola.sincronizar();
    await esperar();
    httpMock.expectOne('/api/harvests').error(new ProgressEvent('error'));
    await fin;

    httpMock.expectNone('/api/workdays');
    expect(cola.porEnviar()).toBe(2);
    expect(cola.conError()).toBe(0);
    expect(cola.enviados()).toBe(0);
  });

  it('un error del servidor (500) también espera al siguiente intento', async () => {
    await cola.encolar('actividad', '/api/activities', {}, 'clave-0001');
    const fin = cola.sincronizar();
    await esperar();
    httpMock.expectOne('/api/activities').flush('x', { status: 500, statusText: 'x' });
    await fin;
    expect(cola.porEnviar()).toBe(1);
  });

  it('descartar lo borra del dispositivo', async () => {
    await cola.encolar('actividad', '/api/activities', {}, 'clave-0001');
    await cola.descartar('clave-0001');
    expect(cola.pendientes()).toEqual([]);
  });

  it('cada cuenta ve solo sus pendientes', async () => {
    await cola.encolar('actividad', '/api/activities', {}, 'clave-0001');
    usuario = { id: 6 };
    await cola.refrescar();
    expect(cola.pendientes()).toEqual([]);
    usuario = { id: 5 };
    await cola.refrescar();
    expect(cola.pendientes().length).toBe(1);
  });

  it('sin sesión no se puede encolar', async () => {
    usuario = null;
    await expect(cola.encolar('actividad', '/api/activities', {}, 'clave-0001')).rejects.toThrow();
  });

  it('no guarda copias de consultas demasiado grandes', async () => {
    cola.guardarLectura('/api/x', { foto: 'a'.repeat(500_000) });
    await esperar();
    expect(await cola.leerLectura('/api/x')).toBeNull();
  });
});
