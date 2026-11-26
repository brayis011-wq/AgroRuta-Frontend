import { comparar } from './yield';
import { RendimientoTrabajador } from '../../../core/models/worker.model';

const base: RendimientoTrabajador = {
  trabajadorId: 1,
  nombre: 'Eva Ruiz',
  cargo: 'Jornalero',
  modalidadCargo: 'JORNAL',
  diasPorDia: 2,
  kilosPorDia: 100,
  pagadoPorDia: 120000,
  diasPorKilo: 0,
  kilosPorKilo: 0,
  pagadoPorKilo: 0,
  kilosAlDia: 50,
  costoKiloPorDia: 1200,
  costoKiloPorKilo: null,
};

describe('comparar (rendimiento)', () => {
  it('sin días al kilo compara con lo que se paga el kilo al equipo', () => {
    expect(comparar(base, 900)).toEqual({ mejor: 'KILO', diferencia: 300, delEquipo: true });
  });

  it('con los dos datos del mismo trabajador dice cuál sale más barato', () => {
    const r = {
      ...base,
      diasPorKilo: 1,
      kilosPorKilo: 40,
      pagadoPorKilo: 60000,
      costoKiloPorKilo: 1500,
    };
    expect(comparar(r, 900)).toEqual({ mejor: 'DIA', diferencia: 300, delEquipo: false });
  });

  it('casi igual o sin datos para comparar', () => {
    expect(comparar(base, 1190)?.mejor).toBe('IGUAL');
    expect(comparar(base, null)).toBeNull();
    expect(comparar({ ...base, costoKiloPorDia: null }, 900)).toBeNull();
  });
});
