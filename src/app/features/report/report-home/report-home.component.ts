import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PayrollReportComponent } from '../payroll/payroll-report.component';
import { CropReportComponent } from '../crop/crop-report.component';

@Component({
  selector: 'app-report-home',
  standalone: true,
  imports: [CommonModule, PayrollReportComponent, CropReportComponent],
  templateUrl: './report-home.component.html',
  styleUrl: './report-home.component.css'
})
export class ReportHomeComponent {
  activeTab: 'payroll' | 'crops' = 'payroll';

  setTab(tab: 'payroll' | 'crops'): void {
    this.activeTab = tab;
  }
}
