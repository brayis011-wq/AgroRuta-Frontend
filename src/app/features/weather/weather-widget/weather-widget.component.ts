import { Component, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { WeatherService } from '../../../core/services/weather.service';
import { LanguageService } from '../../../core/services/language.service';
import { Weather } from '../../../core/models/weather.model';

// Códigos de ícono de OpenWeather para los que hay traducción
const CODIGOS_CLIMA = ['01', '02', '03', '04', '09', '10', '11', '13', '50'];

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './weather-widget.component.html',
  styleUrl: './weather-widget.components.css'
})
export class WeatherWidgetComponent implements OnInit {
  private weatherService: WeatherService = inject(WeatherService);
  private lang = inject(LanguageService);

  city         = input<string>('Bogotá');
  lat          = input<number | null>(null);
  lng          = input<number | null>(null);
  locationName = input<string | null>(null);

  weather = signal<Weather | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null); // guarda la clave de traducción

  // Nombre a mostrar: prioridad locationName > nombre de la API
  displayCity = computed(() => {
    return this.locationName() ?? this.weather()?.city ?? '';
  });

  /**
   * Clave de traducción de la condición del clima, según el código del ícono
   * (ej. ".../10d@2x.png" -> "weather.conditions.c10").
   * En español devuelve null y se usa la descripción original del backend.
   */
  descriptionKey = computed<string | null>(() => {
    const w = this.weather();
    if (!w || this.lang.current() === 'es') return null;
    const archivo = w.iconUrl?.split('/').pop() ?? '';
    const codigo = /^(\d{2})[dn]/.exec(archivo)?.[1];
    return codigo && CODIGOS_CLIMA.includes(codigo)
      ? `weather.conditions.c${codigo}`
      : null;
  });

  ngOnInit() {
    this.loadWeather();
  }

  loadWeather() {
    this.loading.set(true);
    this.error.set(null);

    const latVal = this.lat();
    const lngVal = this.lng();

    const obs = (latVal !== null && lngVal !== null)
      ? this.weatherService.getByCoordinates(latVal, lngVal)
      : this.weatherService.getByCity(this.city());

    obs.subscribe({
      next: (data: Weather) => {
        this.weather.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('weather.error');
        this.loading.set(false);
      }
    });
  }
}
