// src/app/core/services/profile.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProfileService } from './profile.service';
import { Perfil, UpdateProfileRequest, ChangePasswordRequest } from '../models/profile.model';
import { environment } from '../../../environments/environment';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  const base = `${environment.apiUrl}/api/configuration`;

  const mockPerfil: Perfil = { id: 1, nombre: 'Juan', email: 'juan@test.com' } as any;
  const mockUpdateRequest: UpdateProfileRequest = { nombre: 'Juan Updated' } as any;
  const mockPasswordRequest: ChangePasswordRequest = { currentPassword: '123', newPassword: '456' } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProfileService,
      ],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPerfil() should GET perfil', () => {
    service.getPerfil().subscribe(r => expect(r).toEqual(mockPerfil));
    const req = httpMock.expectOne(`${base}/profile`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPerfil);
  });

  it('updatePerfil() should PUT and return updated perfil', () => {
    service.updatePerfil(mockUpdateRequest).subscribe(r => expect(r).toEqual(mockPerfil));
    const req = httpMock.expectOne(`${base}/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockUpdateRequest);
    req.flush(mockPerfil);
  });

  it('changePassword() should PATCH password', () => {
    service.changePassword(mockPasswordRequest).subscribe(r => expect(r).toBeUndefined());
    const req = httpMock.expectOne(`${base}/profile/password`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(mockPasswordRequest);
    req.flush(null);
  });

  it('changePassword() should keep the session with the new token', () => {
    const auth = TestBed.inject(AuthService);
    service.changePassword(mockPasswordRequest).subscribe();
    httpMock.expectOne(`${base}/profile/password`).flush({ token: 'nuevo' });
    expect(auth.getToken()).toBe('nuevo');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
