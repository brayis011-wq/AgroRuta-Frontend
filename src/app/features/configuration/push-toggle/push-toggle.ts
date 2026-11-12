import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AvisosPushService, EstadoPush } from '../../../core/services/push.service';

/** Interruptor de los avisos push en este dispositivo (dentro de la tarjeta de avisos de Configuración). */
@Component({
  selector: 'app-push-toggle',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './push-toggle.html',
  styleUrls: ['../../crop/crop-ui.css', '../pages/configuration-page/configuration-page.scss', './push-toggle.css'],
})
export class PushToggleComponent implements OnInit {
  private push = inject(AvisosPushService);

  /** null mientras se consulta */
  readonly estado = signal<EstadoPush | null>(null);
  readonly ocupado = signal(false);
  /** Clave i18n del resultado de la última acción */
  readonly mensaje = signal<{ texto: string; error: boolean } | null>(null);

  ngOnInit(): void {
    void this.push.estado().then((e) => this.estado.set(e));
  }

  async cambiar(activar: boolean): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set(null);
    try {
      const nuevo = activar ? await this.push.activar() : await this.push.desactivar();
      this.estado.set(nuevo);
      if (activar && nuevo === 'activo') this.mensaje.set({ texto: 'config.push.enabled', error: false });
      if (activar && nuevo === 'bloqueado') this.mensaje.set({ texto: 'config.push.blocked', error: true });
    } catch {
      this.estado.set(await this.push.estado());
      this.mensaje.set({ texto: 'config.push.error', error: true });
    } finally {
      this.ocupado.set(false);
    }
  }

  async probar(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensaje.set(null);
    try {
      const enviados = await this.push.probar();
      this.mensaje.set(enviados > 0 ? { texto: 'config.push.testSent', error: false } : { texto: 'config.push.testFailed', error: true });
    } catch {
      this.mensaje.set({ texto: 'config.push.testFailed', error: true });
    } finally {
      this.ocupado.set(false);
    }
  }
}
