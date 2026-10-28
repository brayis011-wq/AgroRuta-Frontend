import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <button
      type="button"
      class="lang-toggle"
      (click)="toggle()"
      [title]="'common.language' | translate"
      [attr.aria-label]="'common.language' | translate"
    >
      <span class="opt" [class.active]="lang.current() === 'es'">ES</span>
      <span class="sep">/</span>
      <span class="opt" [class.active]="lang.current() === 'en'">EN</span>
    </button>
  `,
  styles: [`
    .lang-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid currentColor;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      line-height: 1;
    }
    .lang-toggle:hover { background: rgba(128, 128, 128, 0.15); }
    .opt { opacity: 0.5; }
    .opt.active { opacity: 1; font-weight: 700; }
    .sep { opacity: 0.4; }
  `],
})
export class LanguageSwitcher {
  lang = inject(LanguageService);

  toggle(): void {
    this.lang.set(this.lang.current() === 'es' ? 'en' : 'es');
  }
}
