import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Política de privacidad pública (la pide Google para usar la API de Gmail). */
@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacidad.html',
  styleUrl: './privacidad.css',
})
export class PrivacidadComponent {
  readonly actualizada = '5 de noviembre de 2026';
}
