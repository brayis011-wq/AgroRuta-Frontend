import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ReportService } from '../../../core/services/report.service';
import { FincaActivaService } from '../../../core/services/active-farm.service';
import { ReportBase } from '../report-base';

/**
 * Reportes → Cuaderno de campo: un PDF con todas las aplicaciones de producto (producto, dosis,
 * carencia y fecha), como lo piden las certificaciones y algunos compradores.
 */
@Component({
  selector: 'app-cuaderno-campo',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './field-book.html',
  styleUrls: ['../report-shared.css', './field-book.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuadernoCampoComponent extends ReportBase {
  private readonly reportes = inject(ReportService);
  readonly fincaActiva = inject(FincaActivaService);

  readonly fincaId = signal<number | null>(this.fincaActiva.activa()?.id ?? null);
  readonly descargando = signal(false);
  readonly error = signal(false);

  descargarPdf(): void {
    this.descargando.set(true);
    this.error.set(false);
    this.reportes.downloadFieldBookPdf(this.fincaId()).subscribe({
      next: (b) => {
        this.descargar(b, 'cuaderno-de-campo.pdf');
        this.descargando.set(false);
      },
      error: () => {
        this.descargando.set(false);
        this.error.set(true);
      },
    });
  }
}
