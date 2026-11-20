import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injectable, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Puente entre cada reporte y la pantalla de Reportes: "PDF con todo" se elige en el menú de
 * descargas del reporte, pero el panel para escoger las partes vive en la pantalla de Reportes.
 */
@Injectable()
export class PedidoReporteCompleto {
  readonly abierto = signal(false);
}

/** Un solo botón "Descargar ▾" con el PDF del reporte, el Excel (CSV) y el PDF con todo */
@Component({
  selector: 'app-descargas',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './report-downloads.css',
  template: `
    <div class="descargas">
      <button type="button" class="btn-descargar" (click)="abierto.set(!abierto())" [disabled]="deshabilitado()"
              aria-haspopup="menu" [attr.aria-expanded]="abierto()">
        <i class="ti" [class.ti-download]="!descargando()" [class.ti-loader-2]="descargando()" [class.gira]="descargando()" aria-hidden="true"></i>
        {{ (descargando() ? 'reports.downloading' : 'reports.download.button') | translate }}
        <i class="ti ti-chevron-down flecha" [class.girada]="abierto()" aria-hidden="true"></i>
      </button>
      @if (abierto()) {
        <div class="menu" role="menu">
          <button type="button" role="menuitem" (click)="elegir('pdf')" [disabled]="descargando()">
            <i class="ti ti-file-type-pdf" aria-hidden="true"></i>
            <span><b>{{ 'reports.download.pdf' | translate }}</b><small>{{ 'reports.download.pdfHint' | translate }}</small></span>
          </button>
          <button type="button" role="menuitem" (click)="elegir('csv')" [disabled]="!hayDatos()">
            <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
            <span><b>{{ 'reports.csv.button' | translate }}</b><small>{{ 'reports.csv.hint' | translate }}</small></span>
          </button>
          @if (pedido) {
            <button type="button" role="menuitem" (click)="elegir('completo')">
              <i class="ti ti-files" aria-hidden="true"></i>
              <span><b>{{ 'reports.full.button' | translate }}</b><small>{{ 'reports.download.fullHint' | translate }}</small></span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class DescargasReporteComponent {
  readonly descargando = input(false);
  readonly deshabilitado = input(false);
  /** Sin filas no hay nada que pasar a Excel */
  readonly hayDatos = input(true);
  readonly pdf = output<void>();
  readonly csv = output<void>();

  readonly abierto = signal(false);
  protected readonly pedido = inject(PedidoReporteCompleto, { optional: true });
  private readonly el = inject(ElementRef<HTMLElement>);

  elegir(opcion: 'pdf' | 'csv' | 'completo'): void {
    this.abierto.set(false);
    if (opcion === 'pdf') this.pdf.emit();
    else if (opcion === 'csv') this.csv.emit();
    else this.pedido?.abierto.set(true);
  }

  @HostListener('document:click', ['$event.target'])
  alTocarFuera(destino: EventTarget | null): void {
    if (this.abierto() && destino instanceof Node && !this.el.nativeElement.contains(destino)) this.abierto.set(false);
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.abierto.set(false);
  }
}
