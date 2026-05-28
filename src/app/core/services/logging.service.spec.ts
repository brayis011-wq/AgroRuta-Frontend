// src/app/core/services/logging.service.spec.ts
import { vi } from 'vitest';
import { LoggingService, LogLevel } from './logging.service';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(() => {
    service = new LoggingService();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('debug() should call console.debug with formatted message', () => {
    service.debug('test debug');
    expect(console.debug).toHaveBeenCalledWith(
      '%c[DEBUG]%c test debug',
      'color:#888',
      'color:default'
    );
  });

  it('debug() should forward extra args to console.debug', () => {
    service.debug('with args', { extra: true }, 42);
    expect(console.debug).toHaveBeenCalledWith(
      '%c[DEBUG]%c with args',
      'color:#888',
      'color:default',
      { extra: true },
      42
    );
  });

  it('info() should call console.info with formatted message', () => {
    service.info('test info');
    expect(console.info).toHaveBeenCalledWith(
      '%c[INFO]%c test info',
      'color:#4CAF50',
      'color:default'
    );
  });

  it('info() should forward extra args to console.info', () => {
    service.info('with args', 'detail');
    expect(console.info).toHaveBeenCalledWith(
      '%c[INFO]%c with args',
      'color:#4CAF50',
      'color:default',
      'detail'
    );
  });

  it('warn() should call console.warn with formatted message', () => {
    service.warn('test warn');
    expect(console.warn).toHaveBeenCalledWith(
      '%c[WARN]%c test warn',
      'color:#FF9800',
      'color:default'
    );
  });

  it('warn() should forward extra args to console.warn', () => {
    service.warn('with args', 'detail');
    expect(console.warn).toHaveBeenCalledWith(
      '%c[WARN]%c with args',
      'color:#FF9800',
      'color:default',
      'detail'
    );
  });

  it('error() should call console.error with formatted message', () => {
    service.error('test error');
    expect(console.error).toHaveBeenCalledWith(
      '%c[ERROR]%c test error',
      'color:#f44336',
      'color:default'
    );
  });

  it('error() should forward extra args to console.error', () => {
    service.error('with args', new Error('boom'));
    expect(console.error).toHaveBeenCalledWith(
      '%c[ERROR]%c with args',
      'color:#f44336',
      'color:default',
      new Error('boom')
    );
  });

  it('should expose LogLevel enum values correctly', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
  });
});
