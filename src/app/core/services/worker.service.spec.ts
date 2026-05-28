// src/app/core/services/worker.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  ActividadService,
  CargoService,
  TrabajadorService,
  NominaService,
  JornalService,
  PagoService,
} from './worker.service';
import { environment } from '../../../environments/environment';

const api = environment.apiUrl;

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockActividad: any  = { id: 1, nombre: 'Riego', descripcion: 'Regar cultivo' };
const mockCargo: any      = { id: 1, nombre: 'Jornalero', descripcion: 'Campo', valorJornal: 50000 };
const mockTrabajador: any = { id: 1, nombre: 'Juan', apellido: 'Perez', cedula: '123', estado: 'ACTIVO' };
const mockNomina: any     = { id: 1, trabajadorId: 1, valorTotal: 200000, estado: 'PENDIENTE' };
const mockJornal: any     = { id: 1, trabajadorId: 1, cultivoId: 2, fecha: '2024-01-10', valorJornal: 50000 };
const mockPago: any       = { id: 1, nominaId: 1, monto: 200000, metodoPago: 'EFECTIVO' };

// ═══════════════════════════════════════════════════════════════════════════
// ActividadService
// ═══════════════════════════════════════════════════════════════════════════
describe('ActividadService', () => {
  let service: ActividadService;
  let http: HttpTestingController;
  const base = `${api}/api/worker/actividades`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ActividadService],
    });
    service = TestBed.inject(ActividadService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('listar() should GET all actividades', () => {
    service.listar().subscribe(r => expect(r).toEqual([mockActividad]));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([mockActividad]);
  });

  it('crear() should POST actividad', () => {
    service.crear({ nombre: 'Riego', descripcion: 'desc' }).subscribe(r => expect(r).toEqual(mockActividad));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    req.flush(mockActividad);
  });

  it('actualizar() should PUT actividad by id', () => {
    service.actualizar(1, { nombre: 'Fumigacion' }).subscribe(r => expect(r).toEqual(mockActividad));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockActividad);
  });

  it('desactivar() should DELETE actividad by id', () => {
    service.desactivar(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CargoService
// ═══════════════════════════════════════════════════════════════════════════
describe('CargoService', () => {
  let service: CargoService;
  let http: HttpTestingController;
  const base = `${api}/api/cargos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CargoService],
    });
    service = TestBed.inject(CargoService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('listar() should GET all cargos', () => {
    service.listar().subscribe(r => expect(r).toEqual([mockCargo]));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([mockCargo]);
  });

  it('buscarPorId() should GET cargo by id', () => {
    service.buscarPorId(1).subscribe(r => expect(r).toEqual(mockCargo));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCargo);
  });

  it('crear() should POST cargo', () => {
    const body = { nombre: 'Jornalero', descripcion: 'Campo', valorJornal: 50000 };
    service.crear(body).subscribe(r => expect(r).toEqual(mockCargo));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockCargo);
  });

  it('actualizar() should PUT cargo by id', () => {
    const body = { nombre: 'Supervisor', descripcion: 'Sup', valorJornal: 80000 };
    service.actualizar(1, body).subscribe(r => expect(r).toEqual(mockCargo));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockCargo);
  });

  it('desactivar() should DELETE cargo by id', () => {
    service.desactivar(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TrabajadorService
// ═══════════════════════════════════════════════════════════════════════════
describe('TrabajadorService', () => {
  let service: TrabajadorService;
  let http: HttpTestingController;
  const base = `${api}/api/trabajadores`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TrabajadorService],
    });
    service = TestBed.inject(TrabajadorService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('listar() should GET trabajadores activos', () => {
    service.listar().subscribe(r => expect(r).toEqual([mockTrabajador]));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([mockTrabajador]);
  });

  it('listarTodos() should GET all trabajadores', () => {
    service.listarTodos().subscribe(r => expect(r).toEqual([mockTrabajador]));
    const req = http.expectOne(`${base}/todos`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTrabajador]);
  });

  it('buscarPorId() should GET trabajador by id', () => {
    service.buscarPorId(1).subscribe(r => expect(r).toEqual(mockTrabajador));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTrabajador);
  });

  it('registrar() should POST trabajador', () => {
    const req: any = { nombre: 'Juan', apellido: 'Perez', cedula: '123', fechaIngreso: '2024-01-01', tipoContrato: 'FIJO', cargoId: 1 };
    service.registrar(req).subscribe(r => expect(r).toEqual(mockTrabajador));
    const httpReq = http.expectOne(base);
    expect(httpReq.request.method).toBe('POST');
    httpReq.flush(mockTrabajador);
  });

  it('actualizar() should PUT trabajador by id', () => {
    const body: any = { nombre: 'Juan', apellido: 'Lopez', tipoContrato: 'TEMPORAL' };
    service.actualizar(1, body).subscribe(r => expect(r).toEqual(mockTrabajador));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockTrabajador);
  });

  it('cambiarCargo() should PATCH cargo of trabajador', () => {
    service.cambiarCargo(1, 2).subscribe(r => expect(r).toEqual(mockTrabajador));
    const req = http.expectOne(`${base}/1/cargo/2`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockTrabajador);
  });

  it('desactivar() should PATCH desactivar trabajador', () => {
    service.desactivar(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1/desactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('suspender() should PATCH suspender trabajador', () => {
    service.suspender(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1/suspender`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('reactivar() should PATCH reactivar trabajador', () => {
    service.reactivar(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1/reactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NominaService
// ═══════════════════════════════════════════════════════════════════════════
describe('NominaService', () => {
  let service: NominaService;
  let http: HttpTestingController;
  const base = `${api}/api/nominas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NominaService],
    });
    service = TestBed.inject(NominaService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('listarTodas() should GET all nominas', () => {
    service.listarTodas().subscribe(r => expect(r).toEqual([mockNomina]));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([mockNomina]);
  });

  it('listarPorTrabajador() should GET nominas by trabajador', () => {
    service.listarPorTrabajador(1).subscribe(r => expect(r).toEqual([mockNomina]));
    const req = http.expectOne(`${base}/trabajador/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockNomina]);
  });

  it('obtener() should GET nomina by id', () => {
    service.obtener(1).subscribe(r => expect(r).toEqual(mockNomina));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockNomina);
  });

  it('generar() should POST generar nomina', () => {
    const body = { trabajadorId: 1, periodoInicio: '2024-01-01', periodoFin: '2024-01-31' };
    service.generar(body).subscribe(r => expect(r).toEqual(mockNomina));
    const req = http.expectOne(`${base}/generar`);
    expect(req.request.method).toBe('POST');
    req.flush(mockNomina);
  });

  it('aprobar() should PATCH aprobar nomina', () => {
    service.aprobar(1).subscribe(r => expect(r).toEqual(mockNomina));
    const req = http.expectOne(`${base}/1/aprobar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockNomina);
  });

  it('anular() should PATCH anular nomina', () => {
    service.anular(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1/anular`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('reactivar() should PATCH reactivar nomina', () => {
    service.reactivar(1).subscribe(r => expect(r).toEqual(mockNomina));
    const req = http.expectOne(`${base}/1/reactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockNomina);
  });

  it('eliminar() should DELETE nomina by id', () => {
    service.eliminar(1).subscribe(r => expect(r).toBeNull());
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// JornalService
// ═══════════════════════════════════════════════════════════════════════════
describe('JornalService', () => {
  let service: JornalService;
  let http: HttpTestingController;
  const base = `${api}/api/jornales`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), JornalService],
    });
    service = TestBed.inject(JornalService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('registrar() should POST jornal', () => {
    const body: any = { trabajadorId: 1, cultivoId: 2, nombreCultivo: 'Maiz', fecha: '2024-01-10', actividadIds: [1] };
    service.registrar(body).subscribe(r => expect(r).toEqual(mockJornal));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    req.flush(mockJornal);
  });

  it('buscarPorId() should GET jornal by id', () => {
    service.buscarPorId(1).subscribe(r => expect(r).toEqual(mockJornal));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockJornal);
  });

  it('porTrabajador() should GET jornales without date filters', () => {
    service.porTrabajador(1).subscribe(r => expect(r).toEqual([mockJornal]));
    const req = http.expectOne(r => r.url === `${base}/trabajador/1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('inicio')).toBe(false);
    expect(req.request.params.has('fin')).toBe(false);
    req.flush([mockJornal]);
  });

  it('porTrabajador() should GET jornales with date filters', () => {
    service.porTrabajador(1, '2024-01-01', '2024-01-31').subscribe(r => expect(r).toEqual([mockJornal]));
    const req = http.expectOne(r => r.url === `${base}/trabajador/1`);
    expect(req.request.params.get('inicio')).toBe('2024-01-01');
    expect(req.request.params.get('fin')).toBe('2024-01-31');
    req.flush([mockJornal]);
  });

  it('porCultivo() should GET jornales without date filters', () => {
    service.porCultivo(2).subscribe(r => expect(r).toEqual([mockJornal]));
    const req = http.expectOne(r => r.url === `${base}/cultivo/2`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('inicio')).toBe(false);
    req.flush([mockJornal]);
  });

  it('porCultivo() should GET jornales with date filters', () => {
    service.porCultivo(2, '2024-01-01', '2024-01-31').subscribe(r => expect(r).toEqual([mockJornal]));
    const req = http.expectOne(r => r.url === `${base}/cultivo/2`);
    expect(req.request.params.get('inicio')).toBe('2024-01-01');
    expect(req.request.params.get('fin')).toBe('2024-01-31');
    req.flush([mockJornal]);
  });

  it('agregarActividad() should PATCH add actividad to jornal', () => {
    service.agregarActividad(1, 3).subscribe(r => expect(r).toEqual(mockJornal));
    const req = http.expectOne(`${base}/1/actividades/3`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockJornal);
  });

  it('removerActividad() should DELETE actividad from jornal', () => {
    service.removerActividad(1, 3).subscribe(r => expect(r).toEqual(mockJornal));
    const req = http.expectOne(`${base}/1/actividades/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockJornal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PagoService
// ═══════════════════════════════════════════════════════════════════════════
describe('PagoService', () => {
  let service: PagoService;
  let http: HttpTestingController;
  const base = `${api}/api/pagos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PagoService],
    });
    service = TestBed.inject(PagoService);
    http    = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('listarTodos() should GET all pagos', () => {
    service.listarTodos().subscribe(r => expect(r).toEqual([mockPago]));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([mockPago]);
  });

  it('buscarPorId() should GET pago by id', () => {
    service.buscarPorId(1).subscribe(r => expect(r).toEqual(mockPago));
    const req = http.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPago);
  });

  it('historialPorTrabajador() should GET pagos by trabajador', () => {
    service.historialPorTrabajador(1).subscribe(r => expect(r).toEqual([mockPago]));
    const req = http.expectOne(`${base}/trabajador/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPago]);
  });

  it('registrar() should POST pago', () => {
    const body: any = { nominaId: 1, monto: 200000, metodoPago: 'EFECTIVO' };
    service.registrar(body).subscribe(r => expect(r).toEqual(mockPago));
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    req.flush(mockPago);
  });
});
