import { Component, DestroyRef, inject } from '@angular/core';
import { MemoriaScrollService } from './core/services/scroll-memory.service';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog';
import { TemaService } from './core/services/theme.service';
import { ServidorLentoComponent } from './shared/slow-server/slow-server';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogComponent, ServidorLentoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  /** Se crea al arrancar para aplicar el modo claro u oscuro en todas las pantallas */
  private readonly tema = inject(TemaService);

  constructor() {
    // Páginas nuevas arriba; con "atrás", donde se estaba
    inject(MemoriaScrollService).iniciar(inject(DestroyRef));
  }
}
