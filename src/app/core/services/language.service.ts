import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'es' | 'en';

const CLAVE = 'lang';

/**
 * Idioma elegido en este navegador. Si no hay ninguno, el valor guardado no es un idioma de la app
 * o el navegador no deja leer el almacenamiento, se usa español.
 */
export function idiomaGuardado(): Lang {
  try {
    return localStorage.getItem(CLAVE) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  readonly current = signal<Lang>(idiomaGuardado());

  constructor() {
    document.documentElement.lang = this.current();
  }

  set(lang: Lang): void {
    this.translate.use(lang);
    try { localStorage.setItem(CLAVE, lang); } catch { /* sin almacenamiento */ }
    document.documentElement.lang = lang;
    this.current.set(lang);
  }
}
