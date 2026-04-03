import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleFinca } from './detalle-finca';

describe('DetalleFinca', () => {
  let component: DetalleFinca;
  let fixture: ComponentFixture<DetalleFinca>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleFinca],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleFinca);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
