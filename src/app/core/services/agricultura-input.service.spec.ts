// src/app/core/services/agricultural-input.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AgriculturalInputService } from './AgriculturalInput.service';
import { AgriculturalInput, AgriculturalInputRequest } from '../models/AgriculturalInput.model';
import { environment } from '../../../environments/environment';

describe('AgriculturalInputService', () => {
  let service: AgriculturalInputService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/api/agricultural-inputs`;

  const mockInput: AgriculturalInput = { id: 1, name: 'Fertilizante A', type: 'fertilizer' } as any;
  const mockRequest: AgriculturalInputRequest = { name: 'Fertilizante A', type: 'fertilizer' } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgriculturalInputService,
      ],
    });
    service = TestBed.inject(AgriculturalInputService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll() should return all inputs via GET', () => {
    service.getAll().subscribe(result => {
      expect(result).toEqual([mockInput]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockInput]);
  });

  it('search() should send query param and return results', () => {
    service.search('fertilizante').subscribe(result => {
      expect(result).toEqual([mockInput]);
    });

    const req = httpMock.expectOne(`${baseUrl}?q=fertilizante`);
    expect(req.request.method).toBe('GET');
    req.flush([mockInput]);
  });

  it('getById() should return a single input via GET', () => {
    service.getById(1).subscribe(result => {
      expect(result).toEqual(mockInput);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInput);
  });

  it('create() should send POST and return created input', () => {
    service.create(mockRequest).subscribe(result => {
      expect(result).toEqual(mockInput);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockInput);
  });

  it('update() should send PUT and return updated input', () => {
    service.update(1, mockRequest).subscribe(result => {
      expect(result).toEqual(mockInput);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockInput);
  });

  it('delete() should send DELETE request', () => {
    service.delete(1).subscribe(result => {
      expect(result).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getAllAdmin() should GET /todos', () => {
    service.getAllAdmin().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/todos`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('changeStatus() should PATCH /{id}/estado with the new state', () => {
    service.changeStatus(1, false).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('activo')).toBe('false');
    req.flush(mockInput);
  });
});
