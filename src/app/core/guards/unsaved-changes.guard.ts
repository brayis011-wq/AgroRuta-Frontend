import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';

/** Un formulario que sabe si tiene algo escrito sin guardar */
export interface ConCambiosSinGuardar {
  tieneCambios(): boolean;
}

/**
 * Al salir de un formulario con cambios sin guardar se pregunta antes de perderlos (también al
 * cerrar el panel de registro o al usar "atrás"). Después de guardar, el formulario deja de tener
 * cambios y se sale sin preguntar.
 */
export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = (componente) => {
  if (!componente?.tieneCambios?.()) return true;
  const t = inject(TranslateService);
  return inject(ConfirmService).preguntar({
    titulo: t.instant('unsaved.title'),
    mensaje: t.instant('unsaved.message'),
    confirmar: t.instant('unsaved.leave'),
    peligro: true,
  });
};
