import { Injectable, computed, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro' | 'sistema';
const CLAVE = 'tema';

/**
 * Modo claro u oscuro de la app. "sistema" sigue la preferencia del celular o computador
 * y cambia sola cuando esa preferencia cambia. La elección se recuerda en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  /** Lo que eligió la persona */
  readonly tema = signal<Tema>(leer());
  private readonly sistemaOscuro = signal(prefiereOscuro());
  /** Cómo se ve en este momento */
  readonly oscuro = computed(() => this.tema() === 'oscuro' || (this.tema() === 'sistema' && this.sistemaOscuro()));

  constructor() {
    try {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.sistemaOscuro.set(e.matches);
        this.aplicar();
      });
    } catch { /* navegador sin matchMedia */ }
    this.aplicar();
  }

  elegir(tema: Tema): void {
    this.tema.set(tema);
    try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento */ }
    this.aplicar();
  }

  /** Cambia entre claro y oscuro (para el botón rápido del menú) */
  alternar(): void {
    this.elegir(this.oscuro() ? 'claro' : 'oscuro');
  }

  private aplicar(): void {
    document.documentElement.setAttribute('data-tema', this.oscuro() ? 'oscuro' : 'claro');
  }
}

function leer(): Tema {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' || v === 'sistema' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}

function prefiereOscuro(): boolean {
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}
