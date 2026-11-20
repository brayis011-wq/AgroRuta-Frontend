import { Injectable } from '@angular/core';
import {
  InterpolatableTranslationObject, InterpolationParameters, TranslateCompiler, TranslateDefaultParser, TranslationObject,
} from '@ngx-translate/core';

/**
 * Singular automático en las traducciones.
 *
 * Si junto a un texto existe el mismo nombre terminado en "One" ("lots" y "lotsOne"), el texto se
 * vuelve una función: con `count` igual a 1 usa la forma "One" ("1 lote") y si no, la plural
 * ("3 lotes"). Así las pantallas siguen pidiendo una sola clave y no repiten la condición.
 */
@Injectable()
export class CompiladorPlurales extends TranslateCompiler {
  private readonly parser = new TranslateDefaultParser();

  compile(value: string): string {
    return value;
  }

  compileTranslations(translations: TranslationObject): InterpolatableTranslationObject {
    return conSingular(translations, this.parser);
  }
}

export function conSingular(arbol: TranslationObject, parser: TranslateDefaultParser): InterpolatableTranslationObject {
  const salida: InterpolatableTranslationObject = {};
  for (const [clave, valor] of Object.entries(arbol)) {
    const uno = arbol[clave + 'One'];
    if (typeof valor === 'string' && typeof uno === 'string') {
      salida[clave] = (params?: InterpolationParameters) =>
        parser.interpolate(Number(params?.['count']) === 1 ? uno : valor, params) ?? valor;
    } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      salida[clave] = conSingular(valor as TranslationObject, parser);
    } else {
      salida[clave] = valor as InterpolatableTranslationObject[string];
    }
  }
  return salida;
}
