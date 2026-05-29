import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SimpleChange } from '@angular/core';
import { ProfileFormComponent } from './profile-form.component';

const mockPerfil = { id: 1, nombre: 'Juan Perez', email: 'juan@test.com', telefono: '3001234567', fotoPerfil: 'https://example.com/foto.jpg', rol: 'AGRICULTOR' };

describe('ProfileFormComponent', () => {
  let component: ProfileFormComponent;
  let fixture: ComponentFixture<ProfileFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileFormComponent, ReactiveFormsModule, CommonModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('ngOnChanges() should patch form when perfil provided', () => {
    component.perfil = mockPerfil as any;
    component.ngOnChanges({ perfil: new SimpleChange(null, mockPerfil, true) });
    expect(component.form.get('nombre')?.value).toBe('Juan Perez');
  });
  it('ngOnChanges() should reset imageError', () => {
    component.imageError = true;
    component.perfil = mockPerfil as any;
    component.ngOnChanges({ perfil: new SimpleChange(null, mockPerfil, true) });
    expect(component.imageError).toBe(false);
  });
  it('ngOnChanges() should do nothing when perfil is null', () => {
    component.perfil = null;
    component.ngOnChanges({ perfil: new SimpleChange(null, null, true) });
    expect(component.form.get('nombre')?.value).toBe('');
  });
  it('fotoUrl should return fotoPerfil value', () => {
    component.form.get('fotoPerfil')?.setValue('https://foto.jpg');
    expect(component.fotoUrl).toBe('https://foto.jpg');
  });
  it('hasValidImage should return true when foto set and no error', () => {
    component.form.get('fotoPerfil')?.setValue('https://foto.jpg');
    component.imageError = false;
    expect(component.hasValidImage).toBe(true);
  });
  it('hasValidImage should return false when imageError', () => {
    component.form.get('fotoPerfil')?.setValue('https://foto.jpg');
    component.imageError = true;
    expect(component.hasValidImage).toBe(false);
  });
  it('initials should return first two initials', () => {
    component.form.get('nombre')?.setValue('Juan Perez');
    expect(component.initials).toBe('JP');
  });
  it('onImageError() should set imageError true', () => {
    component.onImageError();
    expect(component.imageError).toBe(true);
  });
  it('onFotoChange() should reset imageError', () => {
    component.imageError = true;
    component.onFotoChange();
    expect(component.imageError).toBe(false);
  });
  it('isInvalid() should return false when not touched', () => { expect(component.isInvalid('nombre')).toBe(false); });
  it('onSubmit() should not emit when invalid', () => {
    const spy = vi.spyOn(component.save, 'emit');
    component.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
  it('onSubmit() should emit when valid', () => {
    const spy = vi.spyOn(component.save, 'emit');
    component.form.get('nombre')?.setValue('Juan Perez');
    component.form.get('telefono')?.setValue('3001234567');
    component.onSubmit();
    expect(spy).toHaveBeenCalled();
  });
});
