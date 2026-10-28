import * as L from 'leaflet';
import 'leaflet-draw';
import { TranslateService } from '@ngx-translate/core';

/** Reemplaza los textos por defecto de leaflet-draw con los del idioma activo. */
export function aplicarTextosDibujo(translate: TranslateService): void {
  const t = (k: string): string => translate.instant('mapDraw.' + k);

  // leaflet-draw agrega drawLocal al L global (window.L)
  const Lg: any = (window as any).L ?? (L as any);
  const d = Lg.drawLocal;
  if (!d) return;

  d.draw.toolbar.actions = { title: t('cancelTitle'), text: t('cancel') };
  d.draw.toolbar.finish = { title: t('finishTitle'), text: t('finish') };
  d.draw.toolbar.undo = { title: t('undoTitle'), text: t('undo') };
  d.draw.toolbar.buttons.polygon = t('polygon');

  d.draw.handlers.polygon.tooltip = { start: t('start'), cont: t('cont'), end: t('end') };
  d.draw.handlers.polyline.error = t('crossError');

  d.edit.toolbar.actions.save = { title: t('saveTitle'), text: t('save') };
  d.edit.toolbar.actions.cancel = { title: t('cancelEditTitle'), text: t('cancel') };
  d.edit.toolbar.actions.clearAll = { title: t('clearAllTitle'), text: t('clearAll') };
  d.edit.toolbar.buttons.edit = t('edit');
  d.edit.toolbar.buttons.editDisabled = t('editDisabled');
  d.edit.toolbar.buttons.remove = t('remove');
  d.edit.toolbar.buttons.removeDisabled = t('removeDisabled');

  d.edit.handlers.edit.tooltip = { text: t('editText'), subtext: t('editSubtext') };
  d.edit.handlers.remove.tooltip = { text: t('removeText') };
}
