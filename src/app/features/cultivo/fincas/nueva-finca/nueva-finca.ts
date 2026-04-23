import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-nueva-finca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-finca.html',
  styleUrl: './nueva-finca.css',
})
export class NuevaFincaComponent {
  form = {
    nombre: '',
    ubicacion: '',
    hectareas: null as number | null,
  };

  guardando = false;
  error = '';

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
  ) {}

  registrar(): void {
    if (!this.form.nombre || !this.form.ubicacion || !this.form.hectareas) {
      this.error = 'Por favor completa todos los campos.';
      return;
    }

    const usuario = this.authService.getUsuario();
    if (!usuario?.id) {
      this.error = 'No se encontró el usuario. Por favor inicia sesión de nuevo.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.cultivoService.registrarFinca({
      nombre: this.form.nombre,
      ubicacion: this.form.ubicacion,
      hectareas: this.form.hectareas,
      agricultorId: usuario.id,
    }).subscribe({
      next: () => {
        this.router.navigate(['/cultivo']);
      },
      error: () => {
        this.error = 'Error al registrar la finca. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/cultivo']);
  }
}
