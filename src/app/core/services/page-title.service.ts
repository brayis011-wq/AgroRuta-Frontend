import { DestroyRef, Injectable, Signal, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, of } from 'rxjs';
import { LanguageService } from './language.service';

export const NOMBRE_APP = 'AgroRuta';

/**
 * Título de la pestaña del navegador: "Lote 3 · AgroRuta".
 *
 * Cada ruta trae en `title` una clave de traducción ("layout.nav.payrolls").
 * Las pantallas de detalle registran además un texto propio (el nombre de la finca, del lote…),
 * que manda mientras la pantalla esté abierta.
 */
@Injectable({ providedIn: 'root' })
export class TituloPaginaService {
  private translate = inject(TranslateService);
  private lang = inject(LanguageService);
  private title = inject(Title);

  /** Clave de traducción del título de la ruta actual */
  readonly clave = signal<string | null>(null);
  /** Texto que puso la pantalla abierta (tiene prioridad sobre la clave) */
  private readonly detalles = signal<Signal<string | null>[]>([]);

  private sub?: Subscription;

  constructor() {
    effect(() => {
      const lista = this.detalles();
      const detalle = lista.length ? lista[lista.length - 1]() : null;
      const clave = this.clave();
      this.lang.current(); // volver a traducir al cambiar de idioma
      this.sub?.unsubscribe();
      const texto$ = detalle ? of(detalle) : clave ? this.translate.get(clave) : of(null);
      this.sub = texto$.subscribe((t: string | null) => {
        this.title.setTitle(t && t !== clave ? `${t} · ${NOMBRE_APP}` : NOMBRE_APP);
      });
    });
  }

  /**
   * Una pantalla pone su propio título mientras está abierta.
   * Se quita solo cuando se destruye la pantalla (por eso pide el DestroyRef).
   */
  usarDetalle(texto: Signal<string | null>, destroyRef: DestroyRef): void {
    this.detalles.update((l) => [...l, texto]);
    destroyRef.onDestroy(() => this.detalles.update((l) => l.filter((s) => s !== texto)));
  }
}

/** Le pasa al servicio la clave `title` de la ruta más profunda que la tenga */
@Injectable({ providedIn: 'root' })
export class TituloEstrategia extends TitleStrategy {
  private titulo = inject(TituloPaginaService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titulo.clave.set(this.buildTitle(snapshot) ?? null);
  }
}
