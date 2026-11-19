import { esDeslizarParaVolver } from './swipe-back';

describe('deslizar desde el borde para volver', () => {
  const ini = { x: 10, y: 400, t: 0 };

  it('un deslizamiento corto y horizontal vuelve', () => {
    expect(esDeslizarParaVolver(ini, { x: 140, y: 420, t: 250 })).toBe(true);
  });

  it('poco recorrido, un scroll vertical o un arrastre lento no vuelven', () => {
    expect(esDeslizarParaVolver(ini, { x: 60, y: 400, t: 200 })).toBe(false);
    expect(esDeslizarParaVolver(ini, { x: 120, y: 600, t: 200 })).toBe(false);
    expect(esDeslizarParaVolver(ini, { x: 200, y: 400, t: 1500 })).toBe(false);
  });
});
