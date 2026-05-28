// src/app/core/handlers/error.handler.spec.ts
import { vi } from 'vitest';
import { GlobalErrorHandler } from './error.handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    handler = new GlobalErrorHandler();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create the handler', () => {
    expect(handler).toBeTruthy();
  });

  it('should log message when error is an instance of Error', () => {
    const error = new Error('Test error');
    handler.handleError(error);
    expect(console.error).toHaveBeenCalledWith('Error global capturado:', 'Test error');
  });

  it('should log unknown error when error is not an instance of Error', () => {
    const error = { code: 500, detail: 'something went wrong' };
    handler.handleError(error);
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', error);
  });

  it('should handle null as unknown error', () => {
    handler.handleError(null);
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', null);
  });

  it('should handle string as unknown error', () => {
    handler.handleError('simple string error');
    expect(console.error).toHaveBeenCalledWith('Error desconocido:', 'simple string error');
  });
});
