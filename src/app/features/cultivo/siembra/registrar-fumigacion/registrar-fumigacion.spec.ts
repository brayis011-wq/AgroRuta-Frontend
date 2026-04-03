import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrarFumigacion } from './registrar-fumigacion';

describe('RegistrarFumigacion', () => {
  let component: RegistrarFumigacion;
  let fixture: ComponentFixture<RegistrarFumigacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarFumigacion],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarFumigacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
