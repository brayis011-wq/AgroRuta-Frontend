import { descargarArchivo } from './download';

export type Celda = string | number | null | undefined;

/**
 * Un CSV que Excel abre bien en cada idioma:
 * - español: separador ";" y coma decimal (lo que espera Excel con la configuración de Colombia);
 * - inglés: separador "," y punto decimal.
 * Va con BOM para que Excel lea las tildes, sin separador de miles y con las fechas en AAAA-MM-DD.
 */
export function armarCsv(encabezados: string[], filas: Celda[][], lang: string): string {
  const es = lang.startsWith('es');
  const sep = es ? ';' : ',';
  const celda = (v: Celda): string => {
    if (v === null || v === undefined) return '';
    let s =
      typeof v === 'number'
        ? Number.isFinite(v)
          ? String(Math.round(v * 100) / 100)
          : ''
        : String(v);
    if (typeof v === 'number' && es) s = s.replace('.', ',');
    // Comillas si hace falta; y una fórmula escrita como texto no se ejecuta al abrir en Excel
    if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
    // Solo se entrecomilla lo que lo necesita: un número entre comillas Excel lo toma como texto
    return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [encabezados, ...filas].map((f) => f.map(celda).join(sep));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

/** Arma el CSV y lo guarda en el dispositivo: "reporte-nomina-2026-11-18.csv" */
export function descargarCsv(
  base: string,
  encabezados: string[],
  filas: Celda[][],
  lang: string,
  hoy = new Date(),
): void {
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const blob = new Blob([armarCsv(encabezados, filas, lang)], { type: 'text/csv;charset=utf-8' });
  descargarArchivo(blob, `${base}-${fecha}.csv`);
}
