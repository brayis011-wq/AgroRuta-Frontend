import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { LanguageService } from '../../../core/services/language.service';
import { AgricultorAdmin } from '../../../core/models/admin.model';
import { formatoNumero, formatoPesos } from '../../../shared/formato';

type Orden = 'nombre' | 'hectareas' | 'trabajadores' | 'pagado';

@Component({
  selector: 'app-admin-agricultores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './admin-agricultores.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css'],
})
export class AdminAgricultoresComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  agricultores: AgricultorAdmin[] = [];
  cargando = true;
  error = false;
  busqueda = '';
  orden: Orden = 'nombre';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.adminService.agricultores().subscribe({
      next: (lista) => {
        this.agricultores = lista;
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

  get visibles(): AgricultorAdmin[] {
    const q = this.busqueda.trim().toLowerCase();
    const lista = this.agricultores.filter(
      (a) => !q || a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
    const porOrden: Record<Orden, (a: AgricultorAdmin, b: AgricultorAdmin) => number> = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      hectareas: (a, b) => b.hectareas - a.hectareas,
      trabajadores: (a, b) => b.trabajadoresActivos - a.trabajadoresActivos,
      pagado: (a, b) => b.totalPagado - a.totalPagado,
    };
    return [...lista].sort(porOrden[this.orden]);
  }

  num(valor: number, decimales = 0): string {
    return formatoNumero(valor, this.lang.current(), decimales);
  }

  pesos(valor: number): string {
    return formatoPesos(valor, this.lang.current());
  }
}
