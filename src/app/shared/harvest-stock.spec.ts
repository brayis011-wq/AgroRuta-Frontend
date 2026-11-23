import { quedanPorCosecha } from './harvest-stock';

describe('quedanPorCosecha', () => {
  const cosechas = [
    { id: 3, fecha: '2026-11-22', cantidadKg: 75 },
    { id: 1, fecha: '2026-11-12', cantidadKg: 380 },
    { id: 2, fecha: '2026-11-12', cantidadKg: 20 },
  ];

  it('descuenta lo vendido de las cosechas más viejas primero', () => {
    const q = quedanPorCosecha(cosechas, 390);
    expect(q.get(1)).toBe(0);
    expect(q.get(2)).toBe(10);
    expect(q.get(3)).toBe(75);
  });

  it('sin ventas queda todo; con más vendido que cosechado no queda nada', () => {
    expect(quedanPorCosecha(cosechas, 0).get(3)).toBe(75);
    const todo = quedanPorCosecha(cosechas, 1000);
    expect([...todo.values()]).toEqual([0, 0, 0]);
  });
});
