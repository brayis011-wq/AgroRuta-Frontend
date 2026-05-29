import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangePasswordFormComponent } from './change-password-form.component';

describe('ChangePasswordFormComponent', () => {
  let component: ChangePasswordFormComponent;
  let fixture: ComponentFixture<ChangePasswordFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordFormComponent, ReactiveFormsModule, CommonModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePasswordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('form should be invalid when empty', () => { expect(component.form.invalid).toBe(true); });
  it('isInvalid() should return false when not touched', () => { expect(component.isInvalid('passwordActual')).toBe(false); });
  it('isInvalid() should return true when touched and invalid', () => {
    component.form.get('passwordActual')?.markAsTouched();
    expect(component.isInvalid('passwordActual')).toBe(true);
  });
  it('mismatch should be false when not touched', () => {
    component.form.get('nuevaPassword')?.setValue('pass1');
    component.form.get('confirmarPassword')?.setValue('pass2');
    expect(component.mismatch).toBe(false);
  });
  it('mismatch should be true when passwords differ and touched', () => {
    component.form.get('nuevaPassword')?.setValue('pass1');
    component.form.get('confirmarPassword')?.setValue('pass2');
    component.form.get('confirmarPassword')?.markAsTouched();
    expect(component.mismatch).toBe(true);
  });
  it('mismatch should be false when passwords match', () => {
    component.form.get('nuevaPassword')?.setValue('pass1');
    component.form.get('confirmarPassword')?.setValue('pass1');
    component.form.get('confirmarPassword')?.markAsTouched();
    expect(component.mismatch).toBe(false);
  });
  it('onSubmit() should markAllAsTouched when invalid', () => {
    const spy = vi.spyOn(component.form, 'markAllAsTouched');
    component.onSubmit();
    expect(spy).toHaveBeenCalled();
  });
  it('onSubmit() should not emit when invalid', () => {
    const spy = vi.spyOn(component.changePassword, 'emit');
    component.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
  it('onSubmit() should emit when valid', () => {
    const spy = vi.spyOn(component.changePassword, 'emit');
    component.form.get('passwordActual')?.setValue('oldpass');
    component.form.get('nuevaPassword')?.setValue('newpass1');
    component.form.get('confirmarPassword')?.setValue('newpass1');
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({ passwordActual: 'oldpass', nuevaPassword: 'newpass1' });
  });
  it('loading should default to false', () => { expect(component.loading).toBe(false); });
});
