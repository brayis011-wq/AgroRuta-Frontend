import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { EstadoDosPasos, PreparacionDosPasos, SeguridadService } from '../../../core/services/security.service';

/** inicio: resumen · clave: pide la contraseña · qr: enlaza la app · codigos: los de respaldo · quitar: desactiva */
type Paso = 'inicio' | 'clave' | 'qr' | 'codigos' | 'quitar';

/**
 * Verificación en dos pasos (código de una app de autenticación además de la contraseña).
 * El secreto y los códigos de respaldo solo viven en memoria mientras se muestran.
 */
@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './two-factor.html',
  styleUrls: ['../../crop/crop-ui.css', '../../crop/crop-blocks.css', '../config-fields.css', '../security.css'],
})
export class TwoFactorComponent implements OnInit {
  private seguridad = inject(SeguridadService);

  /** null mientras carga o si no se pudo consultar */
  readonly estado = signal<EstadoDosPasos | null>(null);
  readonly sinDatos = signal(false);
  readonly paso = signal<Paso>('inicio');
  readonly ocupado = signal(false);
  /** Clave i18n del error del paso actual */
  readonly error = signal('');
  readonly preparacion = signal<PreparacionDosPasos | null>(null);
  readonly codigos = signal<string[]>([]);
  readonly copiado = signal(false);

  password = '';
  codigo = '';

  ngOnInit(): void {
    this.seguridad.estado().subscribe({
      next: (e) => this.estado.set(e),
      error: () => this.sinDatos.set(true),
    });
  }

  ir(paso: Paso): void {
    this.password = '';
    this.codigo = '';
    this.error.set('');
    this.copiado.set(false);
    if (paso === 'inicio') {
      this.preparacion.set(null);
      this.codigos.set([]);
    }
    this.paso.set(paso);
  }

  /** Paso 1: con la contraseña el servidor genera el secreto y su QR */
  preparar(): void {
    if (!this.password || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.seguridad.preparar(this.password).subscribe({
      next: (p) => {
        this.ocupado.set(false);
        this.preparacion.set(p);
        this.password = '';
        this.paso.set('qr');
      },
      error: (err) => {
        this.ocupado.set(false);
        this.error.set(err?.status === 422 ? 'config.twoFactor.wrongPassword' : 'config.twoFactor.error');
      },
    });
  }

  /** Paso 2: el primer código de la app confirma que quedó bien enlazada */
  activar(): void {
    const codigo = this.codigo.trim();
    if (!codigo || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.seguridad.activar(codigo).subscribe({
      next: (r) => {
        this.ocupado.set(false);
        this.codigo = '';
        this.preparacion.set(null);
        this.codigos.set(r.codigosRespaldo);
        this.estado.set({ activo: true, codigosRespaldo: r.codigosRespaldo.length });
        this.paso.set('codigos');
      },
      error: (err) => {
        this.ocupado.set(false);
        this.codigo = '';
        this.error.set(err?.status === 422 ? 'config.twoFactor.wrongCode' : 'config.twoFactor.error');
      },
    });
  }

  desactivar(): void {
    const codigo = this.codigo.trim();
    if (!this.password || !codigo || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.seguridad.desactivar(this.password, codigo).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.estado.set({ activo: false, codigosRespaldo: 0 });
        this.ir('inicio');
      },
      error: (err) => {
        this.ocupado.set(false);
        this.codigo = '';
        this.error.set(
          err?.error?.errorCode === 'AGR-035' ? 'config.twoFactor.wrongCode'
            : err?.status === 422 ? 'config.twoFactor.wrongPassword'
            : 'config.twoFactor.error',
        );
      },
    });
  }

  /** La clave en grupos de 4 se copia a mano con menos errores */
  get secretoLegible(): string {
    return (this.preparacion()?.secreto ?? '').replace(/(.{4})/g, '$1 ').trim();
  }

  copiarCodigos(): void {
    navigator.clipboard?.writeText(this.codigos().join('\n')).then(
      () => this.copiado.set(true),
      () => this.copiado.set(false),
    );
  }
}
