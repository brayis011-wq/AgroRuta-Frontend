import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AvisosService } from '../../../core/services/toast.service';

/** Aviso de "quedó guardado": baja desde arriba, dibuja el chulo y se va solo. Tocar lo cierra. */
@Component({
  selector: 'app-aviso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="zona" role="status" aria-live="polite">
      @for (a of lista(); track a.id) {
        <button type="button" class="aviso" [class.saliendo]="avisos.saliendo()" (click)="avisos.cerrar()">
          <span class="marca" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6.5 12.6l3.6 3.6 7.4-7.8" /></svg>
          </span>
          <span class="texto">{{ a.clave | translate: a.params }}</span>
        </button>
      }
    </div>
  `,
  styleUrl: './toast.css',
})
export class AvisoComponent {
  readonly avisos = inject(AvisosService);
  /** Lista de uno: al cambiar el id, Angular crea el elemento de nuevo y la animación vuelve a empezar */
  readonly lista = computed(() => {
    const a = this.avisos.actual();
    return a ? [a] : [];
  });
}
