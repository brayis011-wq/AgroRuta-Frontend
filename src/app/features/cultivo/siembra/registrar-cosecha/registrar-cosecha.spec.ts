import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrarCosecha } from './registrar-cosecha';

describe('RegistrarCosecha', () => {
  let component: RegistrarCosecha;
  let fixture: ComponentFixture<RegistrarCosecha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarCosecha],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarCosecha);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
