import { MAX_ARCHIVO, revisarArchivo } from './foto';

describe('revisarArchivo', () => {
  const archivo = (nombre: string, tipo: string, tam = 1000) => {
    const f = new File(['x'], nombre, { type: tipo });
    Object.defineProperty(f, 'size', { value: tam });
    return f;
  };

  it('accepts common photo formats', () => {
    expect(revisarArchivo(archivo('a.jpg', 'image/jpeg'))).toBeNull();
    expect(revisarArchivo(archivo('a.png', 'image/png'))).toBeNull();
    expect(revisarArchivo(archivo('a.webp', 'image/webp'))).toBeNull();
    expect(revisarArchivo(archivo('IMG_001.HEIC', ''))).toBeNull();
  });

  it('rejects files that are not images', () => {
    expect(revisarArchivo(archivo('notas.txt', 'text/plain'))).toBe('tipo');
    expect(revisarArchivo(archivo('logo.svg', 'image/svg+xml'))).toBe('tipo');
  });

  it('rejects very large files', () => {
    expect(revisarArchivo(archivo('a.jpg', 'image/jpeg', MAX_ARCHIVO + 1))).toBe('pesada');
  });
});
