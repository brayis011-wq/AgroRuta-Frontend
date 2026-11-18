import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit,
  afterNextRender, computed, inject, input, signal, viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AvisoBandeja, BandejaAvisosService } from '../../core/services/inbox.service';
import { LanguageService } from '../../core/services/language.service';
import { TextoAviso, haceCuanto, textoAviso } from './inbox-text';

interface Fila { aviso: AvisoBandeja; texto: TextoAviso; cuando: string }
interface Posicion { left: string; right: string; top: string; bottom: string; width: string }

/**
 * La campana: el número de avisos sin leer y, al tocarla, la lista de los últimos.
 * - modo "menu": botón cuadrado de la cabecera del menú lateral (escritorio); la lista sale al lado.
 * - modo "barra": botón de la barra inferior del celular; la lista sale desde abajo.
 * La lista va en la capa superior del navegador (popover) para que ningún contenedor la recorte.
 */
@Component({
  selector: 'app-campana',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './inbox-bell.html',
  styleUrl: './inbox-bell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampanaComponent implements OnInit, OnDestroy {
  readonly bandeja = inject(BandejaAvisosService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly modo = input<'menu' | 'barra'>('menu');
  /** Dónde se configuran los avisos (cambia entre el panel del agricultor y el portal) */
  readonly rutaAjustes = input<string>('/settings');

  readonly abierta = signal(false);
  readonly estilo = signal<Posicion>({ left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', width: 'auto' });
  readonly conPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';
  readonly id = `campana-${Math.random().toString(36).slice(2, 8)}`;

  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  /** "9+" para no ensanchar el globito */
  readonly globo = computed(() => { const n = this.bandeja.noLeidos(); return n > 9 ? '9+' : String(n); });

  readonly filas = computed<Fila[] | null>(() => {
    const lista = this.bandeja.avisos();
    const lang = this.lang.current();
    if (!lista) return null;
    const t = (clave: string, p?: Record<string, unknown>) => this.translate.instant(clave, p) as string;
    return lista.map((aviso) => ({ aviso, texto: textoAviso(aviso, t, lang), cuando: haceCuanto(aviso.creadoEn, lang) }));
  });

  ngOnInit(): void {
    this.bandeja.iniciar();
  }

  ngOnDestroy(): void {
    this.bandeja.detener();
  }

  alternar(ev: Event): void {
    ev.stopPropagation();
    if (this.abierta()) { this.cerrar(); return; }
    this.estilo.set(this.posicion());
    this.abierta.set(true);
    this.bandeja.cargar();
    afterNextRender(() => {
      const el = this.panel()?.nativeElement;
      if (this.conPopover && el && !el.matches(':popover-open')) el.showPopover();
      el?.focus();
    }, { injector: this.injector });
  }

  cerrar(devolverFoco = false): void {
    this.abierta.set(false);
    if (devolverFoco) this.boton().nativeElement.focus();
  }

  abrir(f: Fila): void {
    this.bandeja.marcarLeido(f.aviso);
    this.cerrar();
    if (f.aviso.ruta) void this.router.navigateByUrl(f.aviso.ruta);
  }

  @HostListener('document:click', ['$event'])
  alClicAfuera(ev: Event): void {
    if (this.abierta() && !this.host.nativeElement.contains(ev.target as Node)) this.cerrar();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (this.abierta()) this.cerrar(true);
  }

  @HostListener('window:resize')
  alCambiarTamano(): void {
    if (this.abierta()) this.estilo.set(this.posicion());
  }

  /** Al lado del botón en escritorio; como hoja desde abajo en el celular */
  private posicion(): Posicion {
    const r = this.boton().nativeElement.getBoundingClientRect();
    if (this.modo() === 'barra' || window.innerWidth <= 760) {
      return { left: '8px', right: '8px', top: 'auto', bottom: `${Math.max(8, window.innerHeight - r.top + 8)}px`, width: 'auto' };
    }
    const ancho = Math.min(380, window.innerWidth - r.right - 24);
    return { left: `${r.right + 12}px`, right: 'auto', top: `${Math.max(8, r.top - 8)}px`, bottom: 'auto', width: `${Math.max(300, ancho)}px` };
  }
}
