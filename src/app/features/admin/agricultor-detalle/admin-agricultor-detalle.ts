import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { LanguageService } from '../../../core/services/language.service';
import { AgricultorDetalleAdmin } from '../../../core/models/admin.model';
import { formatoFecha, formatoNumero, formatoPesos } from '../../../shared/formato';

type Pestana = 'fincas' | 'trabajadores' | 'nominas';

@Component({
  selector: 'app-admin-agricultor-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './admin-agricultor-detalle.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', './admin-agricultor-detalle.css'],
})
export class AdminAgricultorDetalleComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  detalle: AgricultorDetalleAdmin | null = null;
  cargando = true;
  error = false;
  pestana: Pestana = 'fincas';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargando = true;
    this.error = false;
    this.adminService.agricultor(id).subscribe({
      next: (d) => {
        this.detalle = d;
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

  claseEstadoNomina(estado: string | null): string {
    switch (estado) {
      case 'PAGADA': return 'ok';
      case 'APROBADA': return 'info';
      case 'PENDIENTE': return 'warn';
      default: return 'off';
    }
  }

  claseEstadoTrabajador(estado: string | null): string {
    switch (estado) {
      case 'ACTIVO': return 'ok';
      case 'SUSPENDIDO': return 'warn';
      default: return 'off';
    }
  }

  num(valor: number | null | undefined, decimales = 0): string {
    return formatoNumero(valor, this.lang.current(), decimales);
  }

  pesos(valor: number | null | undefined): string {
    return formatoPesos(valor, this.lang.current());
  }

  fecha(valor: string | null | undefined): string {
    return formatoFecha(valor, this.lang.current());
  }
}
