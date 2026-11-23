import { HttpErrorResponse } from '@angular/common/http';
import { esSinRedNoAtendido } from './offline-errors';

describe('esSinRedNoAtendido', () => {
  it('solo calla lo que no llegó al servidor', () => {
    expect(esSinRedNoAtendido(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(esSinRedNoAtendido(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(esSinRedNoAtendido(new Error('x'))).toBe(false);
  });
});
