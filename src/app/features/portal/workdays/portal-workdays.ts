import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PortalService } from '../../../core/services/portal.service';
import { LanguageService } from '../../../core/services/language.service';
import { MiJornal } from '../../../core/models/portal.model';
import { formatoFecha, formatoPesos, localeDe } from '../../../shared/format';

interface GrupoMes {
  clave: string;
  titulo: string;
  jornales: MiJornal[];
  total: number;
}

@Component({
  selector: 'app-portal-jornales',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './portal-workdays.html',
  styleUrls: ['../../../shared/styles/panel-page.css', '../../../shared/styles/panel-page-2.css', '../portal-lists.css'],
})
export class PortalJornalesComponent implements OnInit {
  private readonly portal = inject(PortalService);
  private readonly lang = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  grupos: GrupoMes[] = [];
  cargando = true;
  error = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = false;
    this.portal.jornales().subscribe({
      next: (lista) => {
        this.grupos = this.agrupar(lista);
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

  /** Agrupa por mes, del más reciente al más antiguo. */
  private agrupar(lista: MiJornal[]): GrupoMes[] {
    const grupos = new Map<string, GrupoMes>();
    const nombreMes = new Intl.DateTimeFormat(localeDe(this.lang.current()), { month: 'long', year: 'numeric' });
    for (const j of lista) {
      const clave = (j.fecha ?? '').slice(0, 7);
      if (!grupos.has(clave)) {
        const [anio, mes] = clave.split('-').map(Number);
        const texto = anio && mes ? nombreMes.format(new Date(anio, mes - 1, 1)) : '—';
        const titulo = texto.charAt(0).toUpperCase() + texto.slice(1); // "noviembre de 2026" → "Noviembre de 2026"
        grupos.set(clave, { clave, titulo, jornales: [], total: 0 });
      }
      const g = grupos.get(clave)!;
      g.jornales.push(j);
      g.total += j.valor ?? 0;
    }
    return [...grupos.values()].sort((a, b) => b.clave.localeCompare(a.clave));
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  fecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
}
