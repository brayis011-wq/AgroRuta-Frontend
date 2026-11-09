import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../../core/services/admin.service';
import { LanguageService } from '../../../core/services/language.service';
import { AgricultorAdmin, ResumenAdmin, UsuarioAdmin } from '../../../core/models/admin.model';
import { catchError, of } from 'rxjs';
import { formatoFecha, formatoNumero, formatoPesos } from '../../../shared/format';

@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './admin-summary.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', './admin-summary.css'],
})
export class AdminResumenComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);

  resumen: ResumenAdmin | null = null;
  /** Agricultores con más actividad (los que más han pagado en nómina) */
  topAgricultores: AgricultorAdmin[] | null = null;
  /** Últimas cuentas registradas */
  recientes: UsuarioAdmin[] | null = null;
  cargando = true;
  error = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.cargarActividad();
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

  /** Listas de actividad: si fallan solo se quedan vacías, el resumen sigue funcionando */
  private cargarActividad(): void {
    this.adminService.agricultores().pipe(catchError(() => of([] as AgricultorAdmin[]))).subscribe((lista) => {
      this.topAgricultores = [...lista]
        .sort((a, b) => (b.totalPagado ?? 0) - (a.totalPagado ?? 0) || b.fincas - a.fincas)
        .slice(0, 5);
      this.cdr.detectChanges();
    });
    this.adminService.usuarios().pipe(catchError(() => of([] as UsuarioAdmin[]))).subscribe((lista) => {
      this.recientes = [...lista]
        .sort((a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''))
        .slice(0, 5);
      this.cdr.detectChanges();
    });
  }

  /** "3 fincas · 24,5 ha · 9 trabajadores", con singular cuando toca */
  lineaAgricultor(a: AgricultorAdmin): string {
    const t = (clave: string, n: number) =>
      this.translate.instant(`admin.summary.line.${clave}${n === 1 ? 'One' : ''}`, { count: this.num(n) });
    return `${t('farms', a.fincas)} · ${this.num(a.hectareas, 1)} ha · ${t('workers', a.trabajadoresActivos)}`;
  }

  iniciales(nombre: string): string {
    const p = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
  }

  fecha(valor: string | null): string {
    return formatoFecha(valor, this.lang.current());
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
