import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EtiquetasTablaDirective } from './table-labels.directive';

@Component({
  standalone: true,
  imports: [EtiquetasTablaDirective],
  template: `
    <table class="tabla tarjetas-m" arEtiquetas>
      <thead><tr><th>Temporada</th><th>Costo</th><th>Ingresos</th><th></th></tr></thead>
      <tbody>
        @for (f of filas(); track f) {
          <tr><td>{{ f }}</td><td>$ 1</td><td>$ 2</td><td>›</td></tr>
        }
        <tr><td colspan="2">detalle</td><td>$ 3</td></tr>
      </tbody>
    </table>`,
})
class TablaPrueba {
  readonly filas = signal(['Café']);
}

describe('EtiquetasTablaDirective', () => {
  it('copia el título de cada columna a sus celdas (menos la primera y las sin título)', async () => {
    const fx = TestBed.createComponent(TablaPrueba);
    fx.detectChanges();
    const filas = fx.nativeElement.querySelectorAll('tbody tr');
    const celdas = filas[0].querySelectorAll('td');
    expect(celdas[0].hasAttribute('data-l')).toBe(false);
    expect(celdas[1].getAttribute('data-l')).toBe('Costo');
    expect(celdas[2].getAttribute('data-l')).toBe('Ingresos');
    expect(celdas[3].hasAttribute('data-l')).toBe(false);
    // Con colspan, la siguiente celda toma el título de su columna real
    expect(filas[1].querySelectorAll('td')[1].getAttribute('data-l')).toBe('Ingresos');

    // Las filas que llegan después también quedan etiquetadas
    fx.componentInstance.filas.set(['Café', 'Fríjol']);
    fx.detectChanges();
    await new Promise((r) => setTimeout(r));
    expect(fx.nativeElement.querySelectorAll('tbody tr')[1].querySelectorAll('td')[1].getAttribute('data-l')).toBe('Costo');
  });
});
