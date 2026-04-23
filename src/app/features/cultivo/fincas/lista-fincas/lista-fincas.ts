import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CultivoService } from '../../../../core/services/cultivo.service';
import { AuthService } from '../../../../core/services/auth';
import { Finca } from '../../../../core/models/cultivo.model';

@Component({
  selector: 'app-lista-fincas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-fincas.html',
  styleUrl: './lista-fincas.css',
})
export class ListaFincasComponent implements OnInit {
  fincas: Finca[] = [];
  cargando = true;
  error = '';
  eliminandoId: number | null = null;
  fincaAEliminar: Finca | null = null;
  textoConfirmacion = '';

  constructor(
    private cultivoService: CultivoService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (usuario?.id) {
      this.cultivoService.listarFincasPorAgricultor(usuario.id).subscribe({
        next: (fincas) => {
          this.fincas = fincas;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: () => {
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
    this.router.navigate(['/cultivo/nueva-finca']);
  }

  iniciarEliminacion(event: Event, finca: Finca): void {
    event.stopPropagation();
    this.fincaAEliminar = finca;
    this.textoConfirmacion = '';
  }

  cancelarEliminacion(): void {
    this.fincaAEliminar = null;
    this.textoConfirmacion = '';
  }

  confirmarEliminacion(): void {
    if (this.textoConfirmacion !== 'confirmar' || !this.fincaAEliminar) return;

    this.eliminandoId = this.fincaAEliminar.id!;
    this.cultivoService.eliminarFinca(this.fincaAEliminar.id!).subscribe({
      next: () => {
        this.fincas = this.fincas.filter(f => f.id !== this.fincaAEliminar!.id);
        this.fincaAEliminar = null;
        this.textoConfirmacion = '';
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al eliminar la finca.';
        this.eliminandoId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
