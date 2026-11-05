import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

interface Hoja { x: number; y: number; giro: number; tam: number; izq: boolean; }

/** Ilustración animada del acceso: un cultivo sano creciendo bajo el sol */
@Component({
  selector: 'app-auth-cultivo',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './cultivo-anim.html',
  styleUrl: './cultivo-anim.css',
})
export class AuthCultivo {
  /** Plantas: posición de la base y escala; la del centro es la más grande */
  readonly plantas = [
    { x: 106, y: 320, escala: 0.74, retraso: 350 },
    { x: 292, y: 320, escala: 0.82, retraso: 200 },
    { x: 200, y: 324, escala: 1.18, retraso: 0 },
  ];
  /** Hojas de una planta, de abajo hacia arriba (coordenadas relativas a la base) */
  readonly hojas: Hoja[] = [
    { x: 0, y: -34, giro: -18, tam: 0.95, izq: true },
    { x: 0, y: -58, giro: -22, tam: 1, izq: false },
    { x: 0, y: -84, giro: -26, tam: 0.82, izq: true },
    { x: 0, y: -106, giro: -30, tam: 0.72, izq: false },
    { x: 0, y: -128, giro: -42, tam: 0.5, izq: true },
    { x: 0, y: -128, giro: -42, tam: 0.5, izq: false },
  ];
  readonly rayos = Array.from({ length: 12 }, (_, i) => i * 30);
  readonly motas = [[150, 250, 0], [236, 230, 1.2], [272, 270, 2.4], [178, 210, 3.3], [320, 240, 4.1]];

  transformHoja(h: Hoja): string {
    return `translate(${h.x} ${h.y}) scale(${h.izq ? -h.tam : h.tam} ${h.tam}) rotate(${h.giro})`;
  }
}
