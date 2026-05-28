// src/app/core/services/logging.service.ts
import { Injectable, isDevMode } from '@angular/core';

export enum LogLevel { DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3 }

@Injectable({ providedIn: 'root' })
export class LoggingService {

  private level: LogLevel = isDevMode() ? LogLevel.DEBUG : LogLevel.WARN;

  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG)
      console.debug(`%c[DEBUG]%c ${message}`, 'color:#888', 'color:default', ...args);
  }

  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO)
      console.info(`%c[INFO]%c ${message}`, 'color:#4CAF50', 'color:default', ...args);
  }

  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN)
      console.warn(`%c[WARN]%c ${message}`, 'color:#FF9800', 'color:default', ...args);
  }

  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR)
      console.error(`%c[ERROR]%c ${message}`, 'color:#f44336', 'color:default', ...args);
  }
}
