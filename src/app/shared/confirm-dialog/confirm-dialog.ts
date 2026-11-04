import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmService } from './confirm.service';

/** Se monta una sola vez en app.html y muestra las preguntas de ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (servicio.pendiente(); as p) {
      <div class="overlay" (click)="servicio.responder(false)">
        <div class="dialog" role="alertdialog" aria-modal="true"
             aria-labelledby="confirm-titulo" aria-describedby="confirm-mensaje"
             (click)="$event.stopPropagation()">
          <h2 id="confirm-titulo">{{ p.titulo || ('confirmDialog.title' | translate) }}</h2>
          <p id="confirm-mensaje">{{ p.mensaje }}</p>
          <div class="acciones">
            <button type="button" class="btn-cancelar" (click)="servicio.responder(false)">
              {{ 'common.cancel' | translate }}
            </button>
            <button #botonConfirmar type="button" class="btn-confirmar" [class.peligro]="p.peligro"
                    (click)="servicio.responder(true)">
              {{ p.confirmar || ('confirmDialog.confirm' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(15, 25, 19, 0.45);
      display: grid; place-items: center; padding: 1rem;
    }
    .dialog {
      box-sizing: border-box; background: #fff; border-radius: 12px; width: min(420px, 100%);
      padding: 1.4rem 1.5rem; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
      display: flex; flex-direction: column; gap: 0.75rem;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    }
    h2 { margin: 0; font-size: 1.05rem; color: #17231c; }
    p { margin: 0; font-size: 0.92rem; line-height: 1.5; color: #2f3b34; }
    .acciones { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.4rem; flex-wrap: wrap; }
    button { font: inherit; font-size: 0.875rem; font-weight: 600; padding: 0.55rem 1rem; border-radius: 7px; cursor: pointer; }
    button:focus-visible { outline: 2px solid #2e7d32; outline-offset: 2px; }
    .btn-cancelar { background: #fff; color: #2f3b34; border: 1px solid #dde5df; }
    .btn-cancelar:hover { border-color: #2e7d32; }
    .btn-confirmar { background: #2e7d32; color: #fff; border: 1px solid #2e7d32; }
    .btn-confirmar:hover { background: #1b5e20; }
    .btn-confirmar.peligro { background: #c62828; border-color: #c62828; }
    .btn-confirmar.peligro:hover { background: #a31f1f; }
  `],
})
export class ConfirmDialogComponent {
  readonly servicio = inject(ConfirmService);
  private readonly botonConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botonConfirmar');

  constructor() {
    // Lleva el foco al botón principal cuando se abre el diálogo
    effect(() => {
      if (this.servicio.pendiente()) {
        queueMicrotask(() => this.botonConfirmar()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.servicio.responder(false);
  }
}
