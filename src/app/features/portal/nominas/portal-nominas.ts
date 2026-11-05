import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PortalService } from '../../../core/services/portal.service';
import { LanguageService } from '../../../core/services/language.service';
import { MiNomina } from '../../../core/models/portal.model';
import { formatoFecha, formatoNumero, formatoPesos } from '../../../shared/formato';

@Component({
  selector: 'app-portal-nominas',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './portal-nominas.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', '../portal-listas.css'],
})
export class PortalNominasComponent implements OnInit {
  private readonly portal = inject(PortalService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  nominas: MiNomina[] = [];
  cargando = true;
  error = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.portal.nominas().subscribe({
      next: (lista) => {
        this.nominas = lista;
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

  clase(estado: MiNomina['estado']): string {
    return estado === 'PAGADA' ? 'ok' : estado === 'APROBADA' ? 'info' : 'warn';
  }

  /** Texto de ayuda según el estado: qué significa para el trabajador. */
  ayuda(estado: MiNomina['estado']): string {
    return estado === 'PAGADA' ? 'portal.rosters.help.paid'
      : estado === 'APROBADA' ? 'portal.rosters.help.approved'
      : 'portal.rosters.help.pending';
  }

  num(v: number): string {
    return formatoNumero(v, this.lang.current());
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  fecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
}
