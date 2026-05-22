import { Component, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../../../core/services/weather.service';
import { Weather } from '../../../core/models/weather.model';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weather-widget.component.html',
  styleUrl: './weather-widget.components.css'
})
export class WeatherWidgetComponent implements OnInit {
  private weatherService: WeatherService = inject(WeatherService);

  city         = input<string>('Bogotá');
  lat          = input<number | null>(null);
  lng          = input<number | null>(null);
  locationName = input<string | null>(null); // 👈 nuevo input

  weather = signal<Weather | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  // Nombre a mostrar: prioridad locationName > nombre de la API
  displayCity = computed(() => {
    return this.locationName() ?? this.weather()?.city ?? '';
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
        this.error.set('No se pudo cargar el clima');
        this.loading.set(false);
      }
    });
  }
}
