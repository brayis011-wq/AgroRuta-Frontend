import { Trabajador } from '../../../core/models/worker.model';

/** Trabajadores del estado elegido cuyo nombre, cédula o cargo contienen lo buscado (sin importar mayúsculas). */
export function filtrarTrabajadores(
  lista: Trabajador[],
  estado: string,
  busqueda: string,
): Trabajador[] {
  const delEstado = estado === 'TODOS' ? lista : lista.filter((t) => t.estado === estado);
  const q = busqueda.trim().toLowerCase();
  if (!q) return delEstado;
  return delEstado.filter(
    (t) =>
      t.nombreCompleto?.toLowerCase().includes(q) ||
      t.cedula?.toLowerCase().includes(q) ||
      t.cargo?.nombre?.toLowerCase().includes(q),
  );
}
