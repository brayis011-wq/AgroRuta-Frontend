import {
  diasVencida,
  kilosQueQuedan,
  pasaDeLoQueQueda,
  sumarPorCalidad,
  totalVenta,
} from './sales-math';

describe('cuentas de las ventas', () => {
  it('el total es kilos por precio, o el escrito si falta uno de los dos', () => {
    expect(totalVenta(120, 17800, null)).toBe(2_136_000);
    expect(totalVenta(null, 17800, 500_000)).toBe(500_000);
    expect(totalVenta(0, 17800, null)).toBeNull();
  });

  it('lo que queda es cosechado menos vendido más lo de la venta en edición, nunca negativo', () => {
    expect(kilosQueQuedan(300, 120.555, 0)).toBe(179.45);
    expect(kilosQueQuedan(300, 280, 50)).toBe(70);
    expect(kilosQueQuedan(100, 150, 0)).toBe(0);
  });

  it('avisa si los kilos pasan de lo que queda, salvo al bajar una venta vieja', () => {
    expect(pasaDeLoQueQueda(80, 79.999, null)).toBe(false); // medio gramo de tolerancia
    expect(pasaDeLoQueQueda(81, 80, null)).toBe(true);
    expect(pasaDeLoQueQueda(90, 10, 100)).toBe(false);
    expect(pasaDeLoQueQueda(5, null, null)).toBe(true);
  });

  it('suma lo que queda por calidad', () => {
    expect(
      sumarPorCalidad([
        { calidad: 'PRIMERA', quedan: 10.111 },
        { calidad: 'SEGUNDA', quedan: 4 },
        { calidad: 'PRIMERA', quedan: 5 },
      ]),
    ).toEqual([
      { calidad: 'PRIMERA', kg: 15.11 },
      { calidad: 'SEGUNDA', kg: 4 },
    ]);
  });

  it('cuenta los días de vencida desde la fecha acordada', () => {
    const ahora = new Date(2026, 10, 25, 12).getTime();
    expect(diasVencida('2026-11-20', ahora)).toBe(6);
    expect(diasVencida('2026-12-01', ahora)).toBe(0);
    expect(diasVencida(null, ahora)).toBe(0);
  });
});
