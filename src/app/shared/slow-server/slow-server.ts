import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ActividadRedService } from '../../core/interceptors/activity-interceptor';

/**
 * Aviso cuando el servidor tarda: en el plan gratis de Render se duerme tras un rato sin uso
 * y la primera llamada puede tardar hasta un minuto. Sin el aviso parece que la app se colgó.
 * Va en la raíz de la app para que también salga al iniciar sesión.
 */
@Component({
  selector: 'app-servidor-lento',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="zona" role="status" aria-live="polite">
      @if (visible()) {
        <div class="aviso">
          <span class="giro" aria-hidden="true"></span>
          <span class="txt">
            <strong>{{ 'slowServer.title' | translate }}</strong>
            <small>{{ 'slowServer.desc' | translate }}</small>
          </span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .zona {
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 210;
        width: max-content;
        max-width: calc(100vw - 24px);
        pointer-events: none;
      }
      .aviso {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.7rem 1rem;
        border-radius: 14px;
        background: var(--ar-superficie);
        color: var(--ar-tinta);
        border: 1px solid var(--ar-borde);
        box-shadow: var(--ar-sombra-2);
        animation: bajar 0.25s ease-out;
      }
      .txt {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      strong {
        font-size: 0.88rem;
      }
      small {
        font-size: 0.78rem;
        color: var(--ar-tinta-3);
      }
      .giro {
        width: 20px;
        height: 20px;
        flex: none;
        border-radius: 50%;
        border: 2.5px solid var(--ar-verde-100);
        border-top-color: var(--ar-verde-600);
        animation: girar 0.9s linear infinite;
      }
      @keyframes girar {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes bajar {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .aviso {
          animation: none;
        }
        .giro {
          animation-duration: 2.5s;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServidorLentoComponent {
  private readonly red = inject(ActividadRedService);
  /** Sin conexión el aviso no ayuda (ese caso lo atiende el indicador de sin conexión) */
  private readonly enLinea = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  readonly visible = computed(() => this.red.lentas() > 0 && this.enLinea());

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.enLinea.set(true));
    window.addEventListener('offline', () => this.enLinea.set(false));
  }
}
