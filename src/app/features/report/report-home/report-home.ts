import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PayrollReportComponent } from '../payroll/payroll-report';
import { CropReportComponent } from '../crop/crop-report';
import { CostsReportComponent } from '../costs/costs-report';

type Tab = 'payroll' | 'crops' | 'costs';
const TABS: Tab[] = ['payroll', 'crops', 'costs'];

@Component({
  selector: 'app-report-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PayrollReportComponent, CropReportComponent, CostsReportComponent],
  templateUrl: './report-home.html',
  styleUrl: './report-home.css'
})
export class ReportHomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeTab: Tab = 'payroll';
  /** Temporada a abrir en la pestaña de costos (?siembra=7) */
  siembra: number | null = null;

  constructor() {
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
}
