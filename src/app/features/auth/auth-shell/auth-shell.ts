import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TemaService } from '../../../core/services/theme.service';
import { LanguageSwitcher } from '../../../shared/language-switcher/language-switcher';
import { AuthCultivo } from '../crop-anim/crop-anim';

/** Marco del login y el registro: la ilustración queda fija y solo cambia el contenido de la tarjeta */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, TranslatePipe, LanguageSwitcher, AuthCultivo],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  readonly tema = inject(TemaService);
  readonly anio = new Date().getFullYear();
}
