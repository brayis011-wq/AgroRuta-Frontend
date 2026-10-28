import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  readonly current = signal<Lang>((localStorage.getItem('lang') as Lang) ?? 'es');

  constructor() {
    document.documentElement.lang = this.current();
  }

  set(lang: Lang): void {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    this.current.set(lang);
  }
}
