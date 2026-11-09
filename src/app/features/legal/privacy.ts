import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Lang, LanguageService } from '../../core/services/language.service';

/**
 * Política de privacidad pública (la pide Google para usar la API de Gmail).
 * El texto legal va completo en cada idioma (no por claves de traducción) para que se pueda leer
 * y revisar de corrido. La versión en español es la que rige (Ley 1581 de 2012, Colombia).
 */
@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class PrivacidadComponent {
  readonly idioma = inject(LanguageService);
  readonly actualizada: Record<Lang, string> = { es: '5 de noviembre de 2026', en: 'November 5, 2026' };

  cambiar(lang: Lang): void {
    this.idioma.set(lang);
  }
}
