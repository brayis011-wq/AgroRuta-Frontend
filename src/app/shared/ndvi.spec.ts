import { rangoNdvi } from './ndvi';

describe('rangoNdvi', () => {
  it('returns the last N days up to today', () => {
    expect(rangoNdvi(90, new Date(2026, 10, 4))).toBe('2026-08-06/2026-11-04');
  });

  it('crosses the year boundary', () => {
    expect(rangoNdvi(10, new Date(2026, 0, 5))).toBe('2025-12-26/2026-01-05');
  });
});
