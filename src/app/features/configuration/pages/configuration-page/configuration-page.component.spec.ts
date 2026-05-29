import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConfigurationPageComponent } from './configuration-page.component';
import { ProfileService } from '../../../../core/services/profile.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

const mockPerfil = {
  id: 1,
  nombre: 'Test',
  apellido: 'User',
  email: 'test@test.com',
  telefono: '',
  fotoPerfil: '',
};

describe('ConfigurationPageComponent', () => {
  vi.setConfig({ testTimeout: 6000 }); // <-- añade esta línea

  let fixture: ComponentFixture<ConfigurationPageComponent>;
  let component: ComponentFixture<ConfigurationPageComponent>;
  let profileService: {
    getPerfil: ReturnType<typeof vi.fn>;
    updatePerfil: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    profileService = {
      getPerfil: vi.fn().mockReturnValue(of(mockPerfil)),
      updatePerfil: vi.fn(),
      changePassword: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ConfigurationPageComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigurationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() should load perfil and set loadingPage to false', () => {
    expect(component.perfil).toEqual(mockPerfil);
    expect(component.loadingPage).toBe(false);
  });

  it('loadPerfil() should set toast error when getPerfil fails', () => {
    profileService.getPerfil.mockReturnValue(throwError(() => new Error()));
    component.loadPerfil();
    expect(component.loadingPage).toBe(false);
    expect(component.toast?.type).toBe('error');
  });

  it('onSaveProfile() should update perfil and show success toast', () => {
    profileService.updatePerfil.mockReturnValue(of(mockPerfil));
    component.onSaveProfile({ nombre: 'Test', apellido: 'User', telefono: '', fotoPerfil: '' });
    expect(component.perfil).toEqual(mockPerfil);
    expect(component.loadingProfile).toBe(false);
    expect(component.toast?.type).toBe('success');
  });

  it('onSaveProfile() should show error toast on failure', () => {
    profileService.updatePerfil.mockReturnValue(throwError(() => new Error()));
    component.onSaveProfile({ nombre: '', apellido: '', telefono: '', fotoPerfil: '' });
    expect(component.loadingProfile).toBe(false);
    expect(component.toast?.type).toBe('error');
  });

  it('onChangePassword() should show success toast on success', () => {
    profileService.changePassword.mockReturnValue(of(void 0));
    component.onChangePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(component.loadingPassword).toBe(false);
    expect(component.toast?.type).toBe('success');
  });

  it('onChangePassword() should show specific message on 400 error', () => {
    profileService.changePassword.mockReturnValue(throwError(() => ({ status: 400 })));
    component.onChangePassword({ currentPassword: 'wrong', newPassword: 'new' });
    expect(component.toast?.message).toContain('actual es incorrecta');
  });

  it('onChangePassword() should show generic message on non-400 error', () => {
    profileService.changePassword.mockReturnValue(throwError(() => ({ status: 500 })));
    component.onChangePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(component.toast?.message).toContain('Error al cambiar');
  });

  it('toast should be cleared after 4 seconds', async () => {
  profileService.changePassword.mockReturnValue(of(void 0));
  component.onChangePassword({ currentPassword: 'old', newPassword: 'new' });
  expect(component.toast).not.toBeNull();
  await new Promise(resolve => setTimeout(resolve, 4100));
  expect(component.toast).toBeNull();
});
});