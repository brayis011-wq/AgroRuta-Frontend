import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of, catchError } from 'rxjs';
import { ReportService } from '../../../core/services/report.service';
import { CultivoService } from '../../../core/services/crop.service';
import { CostosSiembraComponent } from '../../crop/planting/costs/costs';
import { ReportBase } from '../report-base';
import { FilaCostos, OrdenCostos, ordenarCostos, totalesCostos } from './costs-calc';

/** Reportes → Costos: costo, ingresos y ganancia de cada temporada, con el detalle de la elegida */
@Component({
  selector: 'app-costs-report',
  standalone: true,
  imports: [RouterLink, TranslatePipe, CostosSiembraComponent],
  templateUrl: './costs-report.html',
  styleUrls: ['../report-shared.css', '../report-table.css', './costs-report.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostsReportComponent extends ReportBase implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly cultivo = inject(CultivoService);
  private readonly router = inject(Router);

  /** Temporada a abrir (?siembra=7) */
  readonly siembraInicial = input<number | null>(null);

  readonly filasBase = signal<FilaCostos[] | null>(null);
  readonly error = signal(false);
  readonly orden = signal<OrdenCostos>('reciente');
  readonly filtro = signal('');
  readonly elegida = signal<number | null>(null);

  readonly totales = computed(() => totalesCostos(this.filasBase() ?? []));
  readonly filas = computed(() => ordenarCostos(this.filasBase() ?? [], this.orden(), this.filtro()));
  readonly detalle = computed(() => (this.filasBase() ?? []).find((f) => f.siembra.siembraId === this.elegida()) ?? null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.filasBase.set(null);
    this.error.set(false);
    this.reportService.getCropPreview().subscribe({
      next: (r) => {
        const siembras = r.cropDetails ?? [];
        if (!siembras.length) { this.filasBase.set([]); return; }
        forkJoin(siembras.map((s) => this.cultivo.costosSiembra(s.siembraId).pipe(catchError(() => of(null)))))
          .subscribe((cs) => {
            this.filasBase.set(siembras.map((s, i) => ({ siembra: s, costos: cs[i] })));
            const inicial = this.siembraInicial();
            if (inicial && siembras.some((s) => s.siembraId === inicial)) this.elegida.set(inicial);
          });
      },
      error: () => this.error.set(true),
    });
  }

  elegir(id: number): void {
    this.elegida.set(this.elegida() === id ? null : id);
    this.router.navigate([], { queryParams: { tab: 'costs', siembra: this.elegida() }, replaceUrl: true });
    if (this.elegida()) setTimeout(() => document.getElementById('detalle-costos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  /** El backend ya envía "Cultivo · Variedad" (p. ej. "Café · Castillo"); antes se repetía el cultivo */
  nombre(f: FilaCostos): string {
    return f.siembra.variedad;
  }
}
