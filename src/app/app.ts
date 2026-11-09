import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog';
import { TemaService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('agroruta-frontend');
  /** Se crea al arrancar para aplicar el modo claro u oscuro en todas las pantallas */
  private readonly tema = inject(TemaService);
}
