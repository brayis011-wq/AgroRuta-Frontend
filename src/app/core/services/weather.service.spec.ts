// src/app/core/services/weather.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WeatherService } from './weather.service';
import { Weather } from '../models/weather.model';
import { environment } from '../../../environments/environment';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/api/v1/weather`;

  const mockWeather: Weather = {
    city: 'Bogotá',
    temperature: 18,
    description: 'Nublado',
    humidity: 80,
  } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getByCity() should GET weather by city name', () => {
    service.getByCity('Bogotá').subscribe(r => expect(r).toEqual(mockWeather));

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/city`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('city')).toBe('Bogotá');
    req.flush(mockWeather);
  });

  it('getByCoordinates() should GET weather by lat and lon', () => {
    service.getByCoordinates(4.71, -74.07).subscribe(r => expect(r).toEqual(mockWeather));

    const req = httpMock.expectOne(r => r.url === `${baseUrl}/coordinates`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('lat')).toBe('4.71');
    expect(req.request.params.get('lon')).toBe('-74.07');
    req.flush(mockWeather);
  });
});
