import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaFincas } from './lista-fincas';

describe('ListaFincas', () => {
  let component: ListaFincas;
  let fixture: ComponentFixture<ListaFincas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaFincas],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaFincas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
