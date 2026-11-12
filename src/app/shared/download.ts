/** Guarda en el dispositivo un archivo que llegó del servidor (PDF, CSV...). */
export function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "CP-000123": el mismo número que imprime el comprobante */
export function numeroComprobante(pagoId: number): string {
  return 'CP-' + String(pagoId).padStart(6, '0');
}
