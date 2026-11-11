import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of, catchError } from 'rxjs';
import { ReportService } from '../../../core/services/report.service';
import { CultivoService } from '../../../core/services/crop.service';
import { ReportBase } from '../report-base';
import { FilaCostos } from '../costs/costs-calc';
import { RentabilidadLote, TemporadaLote, anchoBarra, rentabilidadPorLote, resumenRentabilidad } from './profitability-calc';

/** Reportes → Rentabilidad: cuánto dejó cada lote y cómo le fue a cada temporada frente a la anterior */
@Component({
  selector: 'app-profitability-report',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './profitability-report.html',
  styleUrls: ['../report-shared.css', '../report-table.css', './profitability-report.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitabilityReportComponent extends ReportBase implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly cultivo = inject(CultivoService);

  readonly filas = signal<FilaCostos[] | null>(null);
  readonly error = signal(false);
  readonly lotes = computed(() => rentabilidadPorLote(this.filas() ?? []));
  readonly resumen = computed(() => resumenRentabilidad(this.lotes()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.filas.set(null);
    this.error.set(false);
    this.reportService.getCropPreview().subscribe({
      next: (r) => {
        const siembras = r.cropDetails ?? [];
        if (!siembras.length) { this.filas.set([]); return; }
        forkJoin(siembras.map((s) => this.cultivo.costosSiembra(s.siembraId).pipe(catchError(() => of(null)))))
          .subscribe((cs) => this.filas.set(siembras.map((s, i) => ({ siembra: s, costos: cs[i] }))));
      },
      error: () => this.error.set(true),
    });
  }

  ancho(t: TemporadaLote, lote: RentabilidadLote): number {
    return anchoBarra(t, lote);
  }

  porcentaje(v: number | null): string {
    return v == null ? '—' : this.numero(v, Math.abs(v) < 10 ? 1 : 0) + ' %';
  }

  /** "+ $ 1.200.000" o "− $ 300.000" */
  conSigno(v: number): string {
    return (v >= 0 ? '+ ' : '− ') + this.pesos(Math.abs(v));
  }
}
