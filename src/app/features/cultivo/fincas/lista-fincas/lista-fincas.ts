import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';
import { Finca } from '../../../../core/models/cultivo.model';

@Component({
  selector: 'app-lista-fincas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-fincas.html',
  styleUrl: './lista-fincas.css',
})
export class ListaFincasComponent implements OnInit {
  fincas: Finca[] = [];
  cargando = true;
  error = '';

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (usuario && usuario.id) {
      this.cultivoService.listarFincasPorAgricultor(usuario.id).subscribe({
        next: (fincas) => {
          this.fincas = fincas;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = 'Error al cargar las fincas.';
          this.cargando = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.error = 'No se encontró el usuario. Por favor inicia sesión de nuevo.';
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  entrarFinca(id: number): void {
    this.router.navigate(['/cultivo/finca', id]);
  }

  nuevaFinca(): void {
    alert('Función de nueva finca próximamente');
  }
}
