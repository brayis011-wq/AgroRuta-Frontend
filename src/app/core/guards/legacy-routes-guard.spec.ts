import { traducirRutaAntigua } from './legacy-routes-guard';

describe('traducirRutaAntigua', () => {
  it('traduce cada segmento y conserva ids y parámetros', () => {
    expect(traducirRutaAntigua('/cultivo/finca/3/nuevo-lote')).toBe('/crops/farm/3/new-plot');
    expect(traducirRutaAntigua('/cultivo/siembra/9/fumigacion/4')).toBe('/crops/planting/9/spraying/4');
    expect(traducirRutaAntigua('/auth/verificar?token=abc')).toBe('/auth/verify?token=abc');
    expect(traducirRutaAntigua('/reportes?tab=costs&siembra=2')).toBe('/reports?tab=costs&siembra=2');
  });

  it('cubre los enlaces que siguen circulando', () => {
    expect(traducirRutaAntigua('/privacidad')).toBe('/privacy');
    expect(traducirRutaAntigua('/auth/restablecer?token=x')).toBe('/auth/reset-password?token=x');
    expect(traducirRutaAntigua('/worker/actividades')).toBe('/worker/labors');
    expect(traducirRutaAntigua('/portal/inicio')).toBe('/portal/home');
  });

  it('devuelve null si la URL no es vieja', () => {
    expect(traducirRutaAntigua('/crops/farm/3')).toBeNull();
    expect(traducirRutaAntigua('/no-existe')).toBeNull();
  });
});
