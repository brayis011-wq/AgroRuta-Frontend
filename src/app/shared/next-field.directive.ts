import { Directive, ElementRef, HostListener, inject } from '@angular/core';

const CAMPOS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * En un formulario, Enter (o "Siguiente" en el teclado del celular) pasa al campo siguiente en vez de
 * enviarlo; en el último campo sí guarda. Las áreas de texto siguen haciendo salto de línea.
 *
 *   <form arSiguienteCampo (ngSubmit)="guardar()">
 */
@Directive({ selector: 'form[arSiguienteCampo]', standalone: true })
export class SiguienteCampoDirective {
  private readonly form = inject(ElementRef<HTMLFormElement>);

  private campos(): HTMLElement[] {
    return Array.from(this.form.nativeElement.querySelectorAll(CAMPOS) as NodeListOf<HTMLElement>)
      .filter((c) => c.offsetParent !== null || c === document.activeElement);
  }

  /** El teclado del celular muestra "Siguiente" o "Listo" según el campo */
  @HostListener('focusin', ['$event.target'])
  alEnfocar(destino: EventTarget | null): void {
    if (!(destino instanceof HTMLInputElement)) return;
    const campos = this.campos();
    destino.enterKeyHint = campos.indexOf(destino) === campos.length - 1 ? 'done' : 'next';
  }

  @HostListener('keydown.enter', ['$event'])
  alEnter(e: Event): void {
    const destino = e.target;
    if (!(destino instanceof HTMLInputElement || destino instanceof HTMLSelectElement)) return;
    const campos = this.campos();
    const i = campos.indexOf(destino);
    if (i < 0 || i === campos.length - 1) return; // el último campo envía el formulario
    e.preventDefault();
    const siguiente = campos[i + 1];
    siguiente.focus();
    if (siguiente instanceof HTMLInputElement && siguiente.type !== 'date') siguiente.select?.();
  }
}
