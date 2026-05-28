import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrarActividad } from './registrar-actividad';
import { provideRouter } from '@angular/router';

describe('RegistrarActividad', () => {
  let component: RegistrarActividad;
  let fixture: ComponentFixture<RegistrarActividad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarActividad],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarActividad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
