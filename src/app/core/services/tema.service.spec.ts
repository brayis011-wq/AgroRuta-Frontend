import { TemaService } from './tema.service';

// Sin TestBed: el servicio no tiene dependencias y así no altera el estado que comparten las demás pruebas
describe('TemaService', () => {
  beforeEach(() => {
    localStorage.removeItem('tema');
    document.documentElement.removeAttribute('data-tema');
  });
  afterEach(() => {
    localStorage.removeItem('tema');
    document.documentElement.removeAttribute('data-tema');
  });

  it('starts in automatic mode when nothing was chosen', () => {
    const s = new TemaService();
    expect(s.tema()).toBe('sistema');
    expect(document.documentElement.getAttribute('data-tema')).toMatch(/claro|oscuro/);
  });

  it('applies and remembers the chosen mode', () => {
    const s = new TemaService();
    s.elegir('oscuro');
    expect(s.oscuro()).toBe(true);
    expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
    expect(localStorage.getItem('tema')).toBe('oscuro');
    s.alternar();
    expect(s.tema()).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
  });
});
