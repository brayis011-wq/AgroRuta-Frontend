import { escribiendoEn, nuevoSegun } from './shortcuts';

describe('atajos de teclado', () => {
  it('"N" abre lo nuevo de cada pantalla', () => {
    expect(nuevoSegun('/crops/planting/32')).toEqual({ ruta: ['/crops/planting', 32, 'activity'] });
    expect(nuevoSegun('/crops/farm/46')).toEqual({ ruta: ['/crops/farm', 46, 'new-plot'] });
    expect(nuevoSegun('/worker')).toEqual({ ruta: ['/worker'], query: { nuevo: '1' } });
    expect(nuevoSegun('/reports')).toEqual({ ruta: ['/worker/workdays/new'] });
  });

  it('no se usan mientras se escribe en un campo', () => {
    expect(escribiendoEn(document.createElement('input'))).toBe(true);
    expect(escribiendoEn(document.createElement('textarea'))).toBe(true);
    expect(escribiendoEn(document.createElement('button'))).toBe(false);
  });
});
