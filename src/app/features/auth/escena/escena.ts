import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

type Momento = 'manana' | 'tarde' | 'noche';

/** Paisaje del inicio de sesión y el registro. El cielo cambia con la hora del día. */
@Component({
  selector: 'app-auth-escena',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './escena.html',
  styleUrls: ['./escena.css', './escena-movil.css'],
  host: { '[class]': 'momento' },
})
export class AuthEscena {
  readonly momento: Momento = AuthEscena.momentoDe(new Date().getHours());
  readonly anio = new Date().getFullYear();
  /** Surcos del primer plano: cada uno es la misma curva, más abajo */
  readonly surcos = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const y = 678 + i * 24;
    return `M-30 ${y} C120 ${y - 56} 260 ${y - 46} 360 ${y - 16} S540 ${y - 6} 630 ${y - 40}`;
  });
  /** Árboles sueltos sobre la loma del medio */
  readonly arboles = [[70, 548, 13], [96, 556, 9], [430, 516, 12], [452, 524, 8], [540, 532, 11], [205, 556, 10]];
  readonly estrellas = Array.from({ length: 26 }, (_, i) => [(i * 137) % 600, 30 + ((i * 89) % 300), i % 3 === 0 ? 1.6 : 1]);

  static momentoDe(hora: number): Momento {
    if (hora >= 5 && hora < 12) return 'manana';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noche';
  }
}
