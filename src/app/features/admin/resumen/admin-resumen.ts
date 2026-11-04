import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { LanguageService } from '../../../core/services/language.service';
import { ResumenAdmin } from '../../../core/models/admin.model';
import { formatoNumero, formatoPesos } from '../formato';

@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './admin-resumen.html',
  styleUrls: ['../admin-page.css', './admin-resumen.css'],
})
export class AdminResumenComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  resumen: ResumenAdmin | null = null;
  cargando = true;
  error = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.adminService.resumen().subscribe({
      next: (r) => {
        this.resumen = r;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get totalUsuarios(): number {
    return this.resumen ? this.resumen.usuariosActivos + this.resumen.usuariosInactivos : 0;
  }

  num(valor: number | null | undefined, decimales = 0): string {
    return formatoNumero(valor, this.lang.current(), decimales);
  }

  pesos(valor: number | null | undefined): string {
    return formatoPesos(valor, this.lang.current());
  }
}
