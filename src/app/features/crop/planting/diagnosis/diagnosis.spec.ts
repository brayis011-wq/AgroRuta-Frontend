import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DiagnosticoSiembraComponent } from './diagnosis';
import { DiagnosticoService } from '../../../../core/services/diagnosis.service';
import { ConfirmService } from '../../../../shared/confirm-dialog/confirm.service';
import { DiagnosticoPlaga } from '../../../../core/models/diagnosis.model';

const roya: DiagnosticoPlaga = {
  id: 5, siembraId: 1, fecha: '2026-11-10T09:30:00', nota: 'polvo naranja', problema: 'Roya del café',
  tipo: 'ENFERMEDAD', confianza: 'MEDIA', sintomas: 'Polvillo anaranjado en el envés.',
  recomendaciones: ['Revisa el resto del lote.', 'Retira las hojas afectadas.'], otrasPosibilidades: ['Mancha de hierro'],
  advertencia: 'Puede extenderse rápido con la lluvia.',
};
const broca: DiagnosticoPlaga = { ...roya, id: 9, problema: 'Broca del café', tipo: 'PLAGA', confianza: 'ALTA', nota: null, advertencia: null };

describe('DiagnosticoSiembraComponent', () => {
  const servicio = { listar: vi.fn(), diagnosticar: vi.fn(), foto: vi.fn(), eliminar: vi.fn() };
  const confirm = { preguntar: vi.fn() };
  let direcciones = 0;

  function crear() {
    TestBed.configureTestingModule({
      imports: [DiagnosticoSiembraComponent],
      providers: [
        { provide: DiagnosticoService, useValue: servicio },
        { provide: ConfirmService, useValue: confirm },
      ],
    });
    const f = TestBed.createComponent(DiagnosticoSiembraComponent);
    f.componentRef.setInput('siembraId', 1);
    f.detectChanges();
    return f;
  }

  beforeEach(() => {
    // jsdom no trae direcciones blob:
    direcciones = 0;
    URL.createObjectURL = vi.fn(() => 'blob:prueba-' + ++direcciones);
    URL.revokeObjectURL = vi.fn();
    servicio.listar.mockReturnValue(of({ disponible: true, restantesHoy: 3, diagnosticos: [roya] }));
  });

  afterEach(() => vi.clearAllMocks());

  it('sin servicio configurado lo dice y no ofrece tomar fotos', () => {
    servicio.listar.mockReturnValue(of({ disponible: false, restantesHoy: 0, diagnosticos: [] }));
    const el: HTMLElement = crear().nativeElement;
    expect(el.querySelector('.apagado')?.textContent).toContain('diagnostico.off');
    expect(el.querySelector('input[type="file"]')).toBeNull();
  });

  it('muestra los diagnósticos guardados y al abrir uno trae su foto', () => {
    servicio.foto.mockReturnValue(of(new Blob(['x'])));
    const f = crear();
    const el: HTMLElement = f.nativeElement;
    expect(servicio.listar).toHaveBeenCalledWith(1);
    expect(el.querySelector('.fila strong')?.textContent).toBe('Roya del café');
    expect(el.querySelector('.detalle')).toBeNull();

    (el.querySelector('.fila') as HTMLButtonElement).click();
    f.detectChanges();
    expect(servicio.foto).toHaveBeenCalledWith(1, 5);
    expect(el.querySelector('.detalle img')?.getAttribute('src')).toBe('blob:prueba-1');
    expect(el.querySelectorAll('.detalle ol li').length).toBe(2);
    expect(el.querySelector('.alerta')?.textContent).toContain('Puede extenderse');

    // Al cerrarlo y abrirlo de nuevo no se vuelve a pedir la foto
    f.componentInstance.alternar(roya);
    f.componentInstance.alternar(roya);
    expect(servicio.foto).toHaveBeenCalledTimes(1);
  });

  it('no deja elegir archivos que no son imágenes', async () => {
    const c = crear().componentInstance;
    const campo = { files: [new File(['x'], 'notas.pdf', { type: 'application/pdf' })], value: 'x' };
    await c.elegir({ target: campo } as unknown as Event);
    expect(c.error()).toBe('diagnostico.errors.tipo');
    expect(c.fase()).toBe('inicio');
    expect(campo.value).toBe('');
  });

  it('analiza la foto elegida, pone el resultado arriba y descuenta un análisis', () => {
    servicio.diagnosticar.mockReturnValue(of(broca));
    const f = crear();
    const c = f.componentInstance;
    const foto = new Blob(['jpeg']);
    c.usar(foto);
    c.nota.set('granos perforados');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.previa img')).toBeTruthy();

    c.analizar();
    f.detectChanges();

    expect(servicio.diagnosticar).toHaveBeenCalledWith(1, foto, 'granos perforados');
    expect(c.estado()?.diagnosticos.map((d) => d.id)).toEqual([9, 5]);
    expect(c.estado()?.restantesHoy).toBe(2);
    expect(c.fase()).toBe('inicio');
    expect(c.nota()).toBe('');
    // Queda abierto y con la foto que ya estaba en el dispositivo
    expect(c.abierto()).toBe(9);
    expect(servicio.foto).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.detalle img')?.getAttribute('src')).toBe('blob:prueba-1');
  });

  it('si el servidor rechaza la foto muestra su mensaje y actualiza cuántas quedan', () => {
    servicio.diagnosticar.mockReturnValue(throwError(() => ({ status: 422, error: { message: 'En la foto no se distingue un cultivo.' } })));
    const c = crear().componentInstance;
    c.usar(new Blob(['jpeg']));
    servicio.listar.mockReturnValue(of({ disponible: true, restantesHoy: 2, diagnosticos: [roya] }));

    c.analizar();

    expect(c.error()).toBe('En la foto no se distingue un cultivo.');
    expect(c.fase()).toBe('lista');
    expect(c.estado()?.restantesHoy).toBe(2);
  });

  it('sin conexión avisa que hace falta internet', () => {
    servicio.diagnosticar.mockReturnValue(throwError(() => ({ status: 0 })));
    const c = crear().componentInstance;
    c.usar(new Blob(['jpeg']));
    c.analizar();
    expect(c.error()).toBe('diagnostico.errors.offline');
    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('con el tope del día usado no deja elegir más fotos', () => {
    servicio.listar.mockReturnValue(of({ disponible: true, restantesHoy: 0, diagnosticos: [] }));
    const el: HTMLElement = crear().nativeElement;
    const campos = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    expect(campos.length).toBe(2);
    expect(campos.every((c) => c.disabled)).toBe(true);
    expect(el.querySelector('.quedan')?.textContent).toContain('diagnostico.noneLeft');
  });

  it('eliminar pide confirmación y quita el diagnóstico de la lista', async () => {
    servicio.eliminar.mockReturnValue(of(undefined));
    const c = crear().componentInstance;

    confirm.preguntar.mockResolvedValue(false);
    await c.eliminar(roya);
    expect(servicio.eliminar).not.toHaveBeenCalled();

    confirm.preguntar.mockResolvedValue(true);
    await c.eliminar(roya);
    expect(servicio.eliminar).toHaveBeenCalledWith(1, 5);
    expect(c.estado()?.diagnosticos).toEqual([]);
  });

  it('si no se pueden cargar, lo dice', () => {
    servicio.listar.mockReturnValue(throwError(() => ({ status: 500 })));
    const el: HTMLElement = crear().nativeElement;
    expect(el.querySelector('.apagado')?.textContent).toContain('diagnostico.loadError');
  });
});
