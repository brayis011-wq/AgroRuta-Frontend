import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminResumenComponent } from './admin-summary';
import { AdminService } from '../../../core/services/admin.service';

describe('AdminResumenComponent', () => {
  let fixture: ComponentFixture<AdminResumenComponent>;
  let adminSvc: any;

  const resumen = {
    usuariosActivos: 8, usuariosInactivos: 2, administradores: 1, agricultores: 5, trabajadoresUsuarios: 2,
    fincas: 6, hectareas: 42.5, lotes: 14, siembrasActivas: 9, cosechaKg: 1250, trabajadoresActivos: 20,
    nominasPorPagar: 3, totalPagado: 4500000,
  };

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [AdminResumenComponent],
      providers: [provideRouter([]), { provide: AdminService, useValue: adminSvc }],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminResumenComponent);
    fixture.detectChanges();
  }

  it('shows the totals', async () => {
    adminSvc = { resumen: vi.fn().mockReturnValue(of(resumen)), agricultores: vi.fn().mockReturnValue(of([])), usuarios: vi.fn().mockReturnValue(of([])) };
    await crear();
    expect(fixture.componentInstance.totalUsuarios).toBe(10);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('42,5');
  });

  it('flags the error when the request fails', async () => {
    adminSvc = { resumen: vi.fn().mockReturnValue(throwError(() => new Error())), agricultores: vi.fn().mockReturnValue(of([])), usuarios: vi.fn().mockReturnValue(of([])) };
    await crear();
    expect(fixture.componentInstance.error).toBe(true);
  });
});
