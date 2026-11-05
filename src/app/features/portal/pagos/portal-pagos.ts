import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PortalService } from '../../../core/services/portal.service';
import { LanguageService } from '../../../core/services/language.service';
import { MiPago } from '../../../core/models/portal.model';
import { formatoFecha, formatoPesos } from '../../../shared/formato';

@Component({
  selector: 'app-portal-pagos',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './portal-pagos.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', '../portal-listas.css'],
})
export class PortalPagosComponent implements OnInit {
  private readonly portal = inject(PortalService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  pagos: MiPago[] = [];
  cargando = true;
  error = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.portal.pagos().subscribe({
      next: (lista) => {
        this.pagos = lista;
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

  get total(): number {
    return this.pagos.reduce((suma, p) => suma + (p.monto ?? 0), 0);
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  fecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
}
