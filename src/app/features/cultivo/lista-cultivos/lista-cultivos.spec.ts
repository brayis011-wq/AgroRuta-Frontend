import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaCultivos } from './lista-cultivos';

describe('ListaCultivos', () => {
  let component: ListaCultivos;
  let fixture: ComponentFixture<ListaCultivos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaCultivos],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaCultivos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
