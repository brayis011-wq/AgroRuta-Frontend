import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

interface Hoja { y: number; giro: number; tam: number; izq: boolean; }
interface Planta { x: number; y: number; escala: number; retraso: number; flor?: boolean; }

/** Ilustración animada del acceso: un cultivo sano creciendo bajo el sol */
@Component({
  selector: 'app-auth-cultivo',
  standalone: true,
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './cultivo-anim.html',
  styleUrl: './cultivo-anim.css',
})
export class AuthCultivo {
  /** Fila del fondo: plantas pequeñas y más claras */
  readonly fondo: Planta[] = [
    { x: 52, y: 318, escala: 0.4, retraso: 700 },
    { x: 128, y: 312, escala: 0.46, retraso: 800 },
    { x: 272, y: 312, escala: 0.46, retraso: 750 },
    { x: 348, y: 318, escala: 0.4, retraso: 850 },
  ];
  /** Fila del frente: la del centro es la más grande */
  readonly frente: Planta[] = [
    { x: 104, y: 352, escala: 0.78, retraso: 300, flor: true },
    { x: 296, y: 352, escala: 0.86, retraso: 150, flor: true },
    { x: 200, y: 356, escala: 1.15, retraso: 0, flor: true },
  ];
  /** Hojas de una planta, de abajo hacia arriba (relativas a la base) */
  readonly hojas: Hoja[] = [
    { y: -34, giro: -18, tam: 0.95, izq: true },
    { y: -58, giro: -22, tam: 1, izq: false },
    { y: -84, giro: -26, tam: 0.82, izq: true },
    { y: -106, giro: -30, tam: 0.72, izq: false },
    { y: -126, giro: -42, tam: 0.5, izq: true },
    { y: -126, giro: -42, tam: 0.5, izq: false },
  ];
  readonly petalos = [0, 72, 144, 216, 288];
  readonly rayos = Array.from({ length: 12 }, (_, i) => i * 30);
  readonly motas = [[150, 262, 0], [236, 240, 1.2], [272, 282, 2.4], [178, 222, 3.3], [330, 252, 4.1], [70, 270, 1.8]];
  readonly pasto = [[22, 360], [40, 366], [362, 362], [380, 368], [150, 384], [252, 386]];

  transformHoja(h: Hoja): string {
    return `translate(0 ${h.y}) scale(${h.izq ? -h.tam : h.tam} ${h.tam}) rotate(${h.giro})`;
  }
  transformPlanta(p: Planta): string {
    return `translate(${p.x} ${p.y}) scale(${p.escala})`;
  }
}
