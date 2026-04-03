import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleLote } from './detalle-lote';

describe('DetalleLote', () => {
  let component: DetalleLote;
  let fixture: ComponentFixture<DetalleLote>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleLote],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleLote);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
