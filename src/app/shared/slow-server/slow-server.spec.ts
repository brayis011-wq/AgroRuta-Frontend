import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActividadRedService } from '../../core/interceptors/activity-interceptor';
import { ServidorLentoComponent } from './slow-server';

describe('ServidorLentoComponent', () => {
  it('aparece mientras haya una llamada lenta y se va cuando responde', () => {
    const fixture = TestBed.createComponent(ServidorLentoComponent);
    const red = TestBed.inject(ActividadRedService);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso')).toBeNull();

    red.lentas.set(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso strong')?.textContent?.trim()).toBe('slowServer.title');
    // La zona con role=status existe siempre, así los lectores de pantalla anuncian el aviso al aparecer
    expect(fixture.nativeElement.querySelector('[role=status]')).not.toBeNull();

    red.lentas.set(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso')).toBeNull();
  });

  it('sin conexión no se muestra (de eso avisa el indicador de sin conexión)', () => {
    const fixture = TestBed.createComponent(ServidorLentoComponent);
    TestBed.inject(ActividadRedService).lentas.set(1);
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso')).toBeNull();
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aviso')).not.toBeNull();
  });
});
