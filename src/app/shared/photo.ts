// Prepara la foto de perfil que sube el usuario: la recorta en cuadrado, la reduce y la
// convierte en una imagen JPEG embebida (data:image/jpeg;base64,...) lista para guardar.

export type ErrorFoto = 'tipo' | 'pesada' | 'lectura';

/** Tamaño máximo del archivo original (las fotos del celular suelen pesar 2-6 MB) */
export const MAX_ARCHIVO = 15 * 1024 * 1024;
/** Lo que acepta el servidor */
export const MAX_RESULTADO = 340_000;

export function revisarArchivo(archivo: File): ErrorFoto | null {
  if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(archivo.type) && !/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(archivo.name)) {
    return 'tipo';
  }
  if (archivo.size > MAX_ARCHIVO) return 'pesada';
  return null;
}

/** Recorta al centro, reduce a `lado` px y baja la calidad hasta que quepa en el servidor */
export async function prepararFoto(archivo: File, lado = 320): Promise<string> {
  const img = await cargar(archivo);
  const ancho = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const alto = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const corte = Math.min(ancho, alto);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = Math.min(lado, corte);
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw 'lectura' as ErrorFoto;
  ctx.fillStyle = '#fff'; // las PNG con fondo transparente quedan sobre blanco
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (ancho - corte) / 2, (alto - corte) / 2, corte, corte, 0, 0, lienzo.width, lienzo.height);
  if ('close' in img) img.close();
  for (const calidad of [0.86, 0.75, 0.6, 0.45]) {
    const url = lienzo.toDataURL('image/jpeg', calidad);
    if (url.length <= MAX_RESULTADO) return url;
  }
  throw 'pesada' as ErrorFoto;
}

/**
 * Reduce la foto para que su lado mayor no pase de `lado` px, sin recortarla, y la devuelve
 * como JPEG. Al redibujarla se pierden los metadatos (ubicación, modelo del teléfono).
 */
export async function reducirFoto(archivo: File, lado = 1280, calidad = 0.85): Promise<Blob> {
  const img = await cargar(archivo);
  const ancho = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const alto = 'naturalHeight' in img ? img.naturalHeight : img.height;
  if (!ancho || !alto) throw 'lectura' as ErrorFoto;
  const factor = Math.min(1, lado / Math.max(ancho, alto));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(ancho * factor));
  lienzo.height = Math.max(1, Math.round(alto * factor));
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw 'lectura' as ErrorFoto;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  if ('close' in img) img.close();
  const foto = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/jpeg', calidad));
  if (!foto) throw 'lectura' as ErrorFoto;
  return foto;
}

async function cargar(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap respeta la orientación de las fotos del celular
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch { /* se intenta con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise<HTMLImageElement>((ok, falla) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => falla('lectura');
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
