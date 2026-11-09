import { consejoFumigacion, municipio } from './weather';

const w = (over: object = {}): any => ({ temperature: 18, windSpeed: 2, iconUrl: 'https://x/img/wn/02d@2x.png', ...over });

describe('consejoFumigacion', () => {
  it('good with calm, dry weather', () => expect(consejoFumigacion(w())).toBe('good'));
  it('rain when the icon is rain, drizzle or storm', () => {
    for (const c of ['09d', '10n', '11d']) expect(consejoFumigacion(w({ iconUrl: `.../${c}@2x.png` }))).toBe('rain');
  });
  it('wind above 4 m/s', () => expect(consejoFumigacion(w({ windSpeed: 6 }))).toBe('wind'));
  it('hot from 30 °C', () => expect(consejoFumigacion(w({ temperature: 31 }))).toBe('hot'));
});

describe('municipio', () => {
  it('takes the municipality from "Vereda, Municipio, Departamento"', () =>
    expect(municipio({ ubicacion: 'El Salitre, Ventaquemada, Boyacá' })).toBe('Ventaquemada'));
  it('uses the only part when there is no comma', () => expect(municipio({ ubicacion: 'Tunja' })).toBe('Tunja'));
  it('empty when missing', () => expect(municipio(null)).toBe(''));
});
