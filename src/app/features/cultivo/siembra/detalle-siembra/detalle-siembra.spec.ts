import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleSiembra } from './detalle-siembra';

describe('DetalleSiembra', () => {
  let component: DetalleSiembra;
  let fixture: ComponentFixture<DetalleSiembra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleSiembra],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleSiembra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
