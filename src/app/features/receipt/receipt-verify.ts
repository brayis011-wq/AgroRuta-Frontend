import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ComprobanteService, ComprobanteVerificado } from '../../core/services/receipt.service';
import { LanguageService } from '../../core/services/language.service';
import { formatoFecha, formatoPesos } from '../../shared/format';

type Estado = 'cargando' | 'valido' | 'invalido' | 'sinConexion';

/**
 * Página pública que abre el QR de un comprobante de pago (/receipt/:id/:code).
 * Muestra el valor y la fecha que tiene el servidor, para compararlos con el papel.
 */
@Component({
  selector: 'app-receipt-verify',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './receipt-verify.html',
  styleUrl: './receipt-verify.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptVerifyComponent implements OnInit {
  private readonly comprobantes = inject(ComprobanteService);
  private readonly lang = inject(LanguageService);

  private readonly ruta = inject(ActivatedRoute);

  readonly estado = signal<Estado>('cargando');
  readonly comprobante = signal<ComprobanteVerificado | null>(null);

  ngOnInit(): void {
    this.verificar();
  }

  verificar(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    const codigo = this.ruta.snapshot.paramMap.get('code') ?? '';
    if (!Number.isInteger(id) || id <= 0 || !codigo) {
      this.estado.set('invalido');
      return;
    }
    this.estado.set('cargando');
    this.comprobantes.verificar(id, codigo).subscribe({
      next: (c) => {
        this.comprobante.set(c);
        this.estado.set('valido');
      },
      // 404 = el código no es de ese pago; cualquier otra cosa es que no se pudo preguntar
      error: (e) => this.estado.set(e?.status === 404 || e?.status === 400 ? 'invalido' : 'sinConexion'),
    });
  }

  pesos(v: number | null | undefined): string {
    return formatoPesos(v, this.lang.current());
  }

  fecha(v: string | null | undefined): string {
    return formatoFecha(v, this.lang.current());
  }
}
