import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PayrollReportComponent } from '../payroll/payroll-report';
import { CropReportComponent } from '../crop/crop-report';
import { CostsReportComponent } from '../costs/costs-report';
import { ProfitabilityReportComponent } from '../profitability/profitability-report';
import { PARTES_REPORTE, ParteReporte, ReportService } from '../../../core/services/report.service';
import { ReportBase } from '../report-base';

type Tab = ParteReporte;
const TABS: Tab[] = PARTES_REPORTE;

@Component({
  selector: 'app-report-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PayrollReportComponent, CropReportComponent, CostsReportComponent, ProfitabilityReportComponent],
  templateUrl: './report-home.html',
  styleUrls: ['./report-home.css', '../report-shared.css'],
})
export class ReportHomeComponent extends ReportBase {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportService = inject(ReportService);

  activeTab: Tab = 'payroll';
  /** Temporada a abrir en la pestaña de costos (?siembra=7) */
  siembra: number | null = null;

  // ── PDF completo ──────────────────────────────────────────────
  readonly partes = PARTES_REPORTE;
  readonly panelCompleto = signal(false);
  /** Partes que llevará el PDF; empiezan todas marcadas */
  readonly elegidas = signal(new Set<ParteReporte>(PARTES_REPORTE));
  readonly descargandoCompleto = signal(false);
  readonly errorCompleto = signal(false);

  constructor() {
    super();
    // La pestaña va en la URL (?tab=crops) para que el menú lateral pueda abrir cada una
    this.route.queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((q) => {
      const tab = q.get('tab') as Tab | null;
      if (!tab || !TABS.includes(tab)) {
        this.setTab('payroll');
        return;
      }
      this.activeTab = tab;
      this.siembra = Number(q.get('siembra')) || null;
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }

  alternarParte(p: ParteReporte): void {
    const s = new Set(this.elegidas());
    if (s.has(p)) s.delete(p); else s.add(p);
    this.elegidas.set(s);
  }

  descargarCompleto(): void {
    // En el orden de las pestañas, no en el que se marcaron
    const partes = this.partes.filter((p) => this.elegidas().has(p));
    if (!partes.length) return;
    this.descargandoCompleto.set(true);
    this.errorCompleto.set(false);
    this.reportService.downloadFullPdf(partes).subscribe({
      next: (b) => {
        this.descargar(b, partes.length === 1 ? `reporte-${partes[0]}.pdf` : 'reporte-agroruta.pdf');
        this.descargandoCompleto.set(false);
        this.panelCompleto.set(false);
      },
      error: () => { this.descargandoCompleto.set(false); this.errorCompleto.set(true); },
    });
  }
}
