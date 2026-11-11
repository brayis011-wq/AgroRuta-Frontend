import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WeatherService } from '../../../core/services/weather.service';
import { LanguageService } from '../../../core/services/language.service';
import { ConsejoClima } from '../../../core/models/weather.model';
import { TextoConsejo, ahoraEnColombia, textoConsejo } from './advice-text';

/**
 * "No fumigues hoy: lluvia en 3 horas". Cruza el pronóstico con las fumigaciones y riegos
 * programados y avisa heladas o lluvia fuerte. Si no hay nada que decir, no ocupa espacio.
 */
@Component({
  selector: 'app-weather-advice',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './weather-advice.html',
  styleUrl: './weather-advice.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherAdviceComponent implements OnInit {
  private readonly clima = inject(WeatherService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);

  readonly consejos = signal<ConsejoClima[]>([]);

  readonly items = computed<(ConsejoClima & TextoConsejo)[]>(() => {
    const idioma = this.lang.current();
    const ahora = ahoraEnColombia();
    return this.consejos().map((c) => ({
      ...c,
      ...textoConsejo(c, ahora, idioma, (clave, params) => this.translate.instant(clave, params)),
    }));
  });

  ngOnInit(): void {
    // Si falla (sin señal, OpenWeather caído) simplemente no se muestra: es una ayuda, no un dato del usuario
    this.clima.consejos().subscribe({ next: (c) => this.consejos.set(c ?? []), error: () => this.consejos.set([]) });
  }

  donde(c: ConsejoClima): string {
    return [c.lote, c.finca].filter(Boolean).join(' · ');
  }
}
