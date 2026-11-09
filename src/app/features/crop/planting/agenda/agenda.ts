import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CultivoService } from '../../../../core/services/crop.service';
import { LanguageService } from '../../../../core/services/language.service';
import { formatoNumero, localeDe } from '../../../../shared/format';
import { EventoCalendario } from '../../../../core/models/crop.model';
import { ICONO_EVENTO, TONO_EVENTO, desdeIso, diasHasta, esPorVenir, iso, ordenAgenda, textoEvento } from '../../calendar/events';

/** Lo que viene para esta siembra en las próximas semanas */
@Component({
  selector: 'app-agenda-siembra',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaSiembraComponent {
  private cultivo = inject(CultivoService);
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);

  readonly siembraId = input.required<number>();
  readonly loteId = input<number | null>(null);
  readonly activa = input(true);
  /** Cambia cuando se registra o borra algo, para recargar */
  readonly version = input(0);

  readonly eventos = signal<EventoCalendario[] | null>(null);
  readonly hoy = iso(new Date());
  readonly icono = ICONO_EVENTO;
  readonly tono = TONO_EVENTO;

  constructor() {
    effect(() => {
      const id = this.siembraId();
      this.version();
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + 45);
      this.cultivo.calendarioSiembra(id, this.hoy, iso(hasta)).subscribe({
        next: (ev) => this.eventos.set(ev.filter(esPorVenir).sort(ordenAgenda).slice(0, 6)),
        error: () => this.eventos.set([]),
      });
    });
  }

  texto(e: EventoCalendario) {
    return textoEvento(e, this.translate, (v, d = 0) => formatoNumero(v, this.lang.current(), d));
  }

  cuando(e: EventoCalendario): string {
    if (e.estado === 'ATRASADO') return this.translate.instant('temporadas.cal.overdue');
    const d = diasHasta(e.fecha, this.hoy);
    if (d === 0) return this.translate.instant('temporadas.cal.today');
    if (d === 1) return this.translate.instant('temporadas.cal.tomorrow');
    return new Intl.DateTimeFormat(localeDe(this.lang.current()), { weekday: 'short', day: 'numeric', month: 'short' })
      .format(desdeIso(e.fecha));
  }
}
