import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PayrollReportComponent } from '../payroll/payroll-report.component';
import { CropReportComponent } from '../crop/crop-report.component';

@Component({
  selector: 'app-report-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PayrollReportComponent, CropReportComponent],
  templateUrl: './report-home.component.html',
  styleUrl: './report-home.component.css'
})
export class ReportHomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeTab: 'payroll' | 'crops' = 'payroll';

  constructor() {
    // La pestaña va en la URL (?tab=crops) para que el menú lateral pueda abrir cada una
    this.route.queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((q) => {
      const tab = q.get('tab');
      if (tab !== 'payroll' && tab !== 'crops') {
        this.setTab('payroll');
        return;
      }
      this.activeTab = tab;
    });
  }

  setTab(tab: 'payroll' | 'crops'): void {
    this.activeTab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
}
