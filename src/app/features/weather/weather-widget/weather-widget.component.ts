import { Component, OnInit, inject, signal, input } from '@angular/core';
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

  city = input<string>('Bogotá');
  weather = signal<Weather | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadWeather();
  }

  loadWeather() {
    this.loading.set(true);
    this.error.set(null);
    this.weatherService.getByCity(this.city()).subscribe({
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
