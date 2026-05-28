// src/app/core/services/cultivo.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CultivoService } from './cultivo.service';
import { environment } from '../../../environments/environment';

describe('CultivoService', () => {
  let service: CultivoService;
  let httpMock: HttpTestingController;
  const api = environment.apiUrl;

  // Mocks reutilizables
  const mockFinca: any = { id: 1, nombre: 'Finca Test' };
  const mockLote: any = { id: 1, nombre: 'Lote Test', fincaId: 1 };
  const mockSiembra: any = { id: 1, loteId: 1, etapa: 'germinacion' };
  const mockActividad: any = { id: 1, siembraId: 1, tipo: 'riego' };
  const mockFumigacion: any = { id: 1, siembraId: 1, producto: 'herbicida' };
  const mockCosecha: any = { id: 1, siembraId: 1, kg: 100 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CultivoService,
      ],
    });
    service = TestBed.inject(CultivoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── FINCAS ──────────────────────────────────────────────
  it('registrarFinca() should POST and return finca', () => {
    service.registrarFinca(mockFinca).subscribe(r => expect(r).toEqual(mockFinca));
    const req = httpMock.expectOne(`${api}/api/fincas`);
    expect(req.request.method).toBe('POST');
    req.flush(mockFinca);
  });

  it('listarFincasPorAgricultor() should GET fincas by agricultor', () => {
    service.listarFincasPorAgricultor(1).subscribe(r => expect(r).toEqual([mockFinca]));
    const req = httpMock.expectOne(`${api}/api/fincas/agricultor/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockFinca]);
  });

  it('buscarFinca() should GET finca by id', () => {
    service.buscarFinca(1).subscribe(r => expect(r).toEqual(mockFinca));
    const req = httpMock.expectOne(`${api}/api/fincas/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFinca);
  });

  it('eliminarFinca() should DELETE finca by id', () => {
    service.eliminarFinca(1).subscribe(r => expect(r).toBeNull());
    const req = httpMock.expectOne(`${api}/api/fincas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('actualizarCentroideFinca() should PATCH finca centroide', () => {
    const body = { centroideLat: 4.5, centroideLng: -74.1 };
    service.actualizarCentroideFinca(1, body).subscribe(r => expect(r).toEqual(mockFinca));
    const req = httpMock.expectOne(`${api}/api/fincas/1/centroide`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockFinca);
  });

  // ── LOTES ───────────────────────────────────────────────
  it('registrarLote() should POST and return lote', () => {
    service.registrarLote(mockLote).subscribe(r => expect(r).toEqual(mockLote));
    const req = httpMock.expectOne(`${api}/api/lotes`);
    expect(req.request.method).toBe('POST');
    req.flush(mockLote);
  });

  it('listarLotesPorFinca() should GET lotes by finca', () => {
    service.listarLotesPorFinca(1).subscribe(r => expect(r).toEqual([mockLote]));
    const req = httpMock.expectOne(`${api}/api/lotes/finca/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockLote]);
  });

  it('buscarLote() should GET lote by id', () => {
    service.buscarLote(1).subscribe(r => expect(r).toEqual(mockLote));
    const req = httpMock.expectOne(`${api}/api/lotes/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLote);
  });

  it('eliminarLote() should DELETE lote by id', () => {
    service.eliminarLote(1).subscribe(r => expect(r).toBeNull());
    const req = httpMock.expectOne(`${api}/api/lotes/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('actualizarGeometriaLote() should PATCH lote geometria', () => {
    const body = { coordenadas: '[]', area: 10, centroideLat: 4.5, centroideLng: -74.1 };
    service.actualizarGeometriaLote(1, body).subscribe(r => expect(r).toEqual(mockLote));
    const req = httpMock.expectOne(`${api}/api/lotes/1/geometria`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockLote);
  });

  // ── SIEMBRAS ────────────────────────────────────────────
  it('registrarSiembra() should POST and return siembra', () => {
    service.registrarSiembra(mockSiembra).subscribe(r => expect(r).toEqual(mockSiembra));
    const req = httpMock.expectOne(`${api}/api/siembras`);
    expect(req.request.method).toBe('POST');
    req.flush(mockSiembra);
  });

  it('buscarSiembraPorLote() should GET siembra by lote', () => {
    service.buscarSiembraPorLote(1).subscribe(r => expect(r).toEqual(mockSiembra));
    const req = httpMock.expectOne(`${api}/api/siembras/lote/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSiembra);
  });

  it('buscarSiembra() should GET siembra by id', () => {
    service.buscarSiembra(1).subscribe(r => expect(r).toEqual(mockSiembra));
    const req = httpMock.expectOne(`${api}/api/siembras/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSiembra);
  });

  it('avanzarEtapa() should PUT siembra etapa', () => {
    service.avanzarEtapa(1).subscribe(r => expect(r).toEqual(mockSiembra));
    const req = httpMock.expectOne(`${api}/api/siembras/1/avanzar-etapa`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockSiembra);
  });

  it('eliminarSiembra() should DELETE siembra by id', () => {
    service.eliminarSiembra(1).subscribe(r => expect(r).toBeNull());
    const req = httpMock.expectOne(`${api}/api/siembras/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ── ACTIVIDADES ─────────────────────────────────────────
  it('registrarActividad() should POST and return actividad', () => {
    service.registrarActividad(mockActividad).subscribe(r => expect(r).toEqual(mockActividad));
    const req = httpMock.expectOne(`${api}/api/actividades`);
    expect(req.request.method).toBe('POST');
    req.flush(mockActividad);
  });

  it('listarActividades() should GET actividades by siembra', () => {
    service.listarActividades(1).subscribe(r => expect(r).toEqual([mockActividad]));
    const req = httpMock.expectOne(`${api}/api/actividades/siembra/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockActividad]);
  });

  // ── FUMIGACIONES ────────────────────────────────────────
  it('registrarFumigacion() should POST and return fumigacion', () => {
    service.registrarFumigacion(mockFumigacion).subscribe(r => expect(r).toEqual(mockFumigacion));
    const req = httpMock.expectOne(`${api}/api/fumigaciones`);
    expect(req.request.method).toBe('POST');
    req.flush(mockFumigacion);
  });

  it('listarFumigaciones() should GET fumigaciones by siembra', () => {
    service.listarFumigaciones(1).subscribe(r => expect(r).toEqual([mockFumigacion]));
    const req = httpMock.expectOne(`${api}/api/fumigaciones/siembra/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockFumigacion]);
  });

  // ── COSECHAS ────────────────────────────────────────────
  it('registrarCosecha() should POST and return cosecha', () => {
    service.registrarCosecha(mockCosecha).subscribe(r => expect(r).toEqual(mockCosecha));
    const req = httpMock.expectOne(`${api}/api/cosechas`);
    expect(req.request.method).toBe('POST');
    req.flush(mockCosecha);
  });

  it('listarCosechas() should GET cosechas by siembra', () => {
    service.listarCosechas(1).subscribe(r => expect(r).toEqual([mockCosecha]));
    const req = httpMock.expectOne(`${api}/api/cosechas/siembra/1`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCosecha]);
  });

  it('totalKgCosechado() should GET total kg by siembra', () => {
    service.totalKgCosechado(1).subscribe(r => expect(r).toBe(250));
    const req = httpMock.expectOne(`${api}/api/cosechas/siembra/1/total-kg`);
    expect(req.request.method).toBe('GET');
    req.flush(250);
  });
});
