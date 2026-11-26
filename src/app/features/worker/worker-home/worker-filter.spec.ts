import { Trabajador } from '../../../core/models/worker.model';
import { filtrarTrabajadores } from './worker-filter';

const t = (nombreCompleto: string, estado: string, cedula: string, cargo: string) =>
  ({ nombreCompleto, estado, cedula, cargo: { nombre: cargo } }) as unknown as Trabajador;

describe('filtrarTrabajadores', () => {
  const equipo = [
    t('Marta Salazar', 'ACTIVO', '1052334120', 'Recolectora'),
    t('Pedro Gómez', 'SUSPENDIDO', '80123456', 'Jornalero'),
    t('Ana Ruiz', 'ACTIVO', '43211234', 'Jornalero'),
  ];

  it('filtra por estado', () => {
    expect(filtrarTrabajadores(equipo, 'ACTIVO', '').length).toBe(2);
    expect(filtrarTrabajadores(equipo, 'TODOS', '').length).toBe(3);
  });

  it('busca por nombre, cédula o cargo sin importar mayúsculas', () => {
    expect(filtrarTrabajadores(equipo, 'TODOS', 'MARTA').map((x) => x.cedula)).toEqual([
      '1052334120',
    ]);
    expect(filtrarTrabajadores(equipo, 'TODOS', '8012').length).toBe(1);
    expect(filtrarTrabajadores(equipo, 'ACTIVO', 'jornalero').map((x) => x.nombreCompleto)).toEqual(
      ['Ana Ruiz'],
    );
  });
});
