import { describe, expect, it } from 'vitest';
import { armarCsv } from './csv';

describe('armarCsv', () => {
  it('en español: punto y coma, coma decimal y BOM para las tildes', () => {
    const csv = armarCsv(['Cultivo', 'Kg'], [['Café', 380.5], ['Fríjol', 1200]], 'es');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1)).toBe('Cultivo;Kg\r\nCafé;380,5\r\nFríjol;1200\r\n');
  });

  it('en inglés: coma y punto decimal', () => {
    expect(armarCsv(['Crop', 'Kg'], [['Coffee', 380.5]], 'en').slice(1)).toBe('Crop,Kg\r\nCoffee,380.5\r\n');
  });

  it('entrecomilla solo lo que contiene el separador, comillas o saltos de línea', () => {
    const csv = armarCsv(['A'], [['Lote 1; norte'], ['Dijo "hola"'], ['Café · Castillo, rojo']], 'es').slice(1);
    expect(csv).toBe('A\r\n"Lote 1; norte"\r\n"Dijo ""hola"""\r\nCafé · Castillo, rojo\r\n');
  });

  it('vacíos y no números quedan en blanco; redondea a dos decimales', () => {
    expect(armarCsv(['A', 'B', 'C'], [[null, undefined, 1 / 3], [NaN, '', 2]], 'en').slice(1))
      .toBe('A,B,C\r\n,,0.33\r\n,,2\r\n');
  });

  it('un texto que empieza como fórmula no se ejecuta en Excel', () => {
    expect(armarCsv(['Nombre'], [['=HYPERLINK("x")'], ['-5 kg']], 'en').slice(1)).toBe('Nombre\r\n"\'=HYPERLINK(""x"")"\r\n\'-5 kg\r\n');
  });
});
