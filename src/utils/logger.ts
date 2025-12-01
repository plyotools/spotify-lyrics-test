/**
 * Logger utility for writing to a log file
 * Logs are written to the console and can be captured
 */
class Logger {
  private logBuffer: string[] = [];
  private maxBufferSize = 1000;

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}`;
  }

  private writeToBuffer(level: string, message: string, ...args: any[]): void {
    const logMessage = this.formatMessage(level, message, ...args);
    this.logBuffer.push(logMessage);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
    
    // Write to console
    switch (level) {
      case 'ERROR':
        console.error(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'INFO':
        console.log(logMessage);
        break;
      case 'DEBUG':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  error(message: string, ...args: any[]): void {
    this.writeToBuffer('ERROR', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.writeToBuffer('WARN', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.writeToBuffer('INFO', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.writeToBuffer('DEBUG', message, ...args);
  }

  getLogs(): string[] {
    return [...this.logBuffer];
  }

  getAllLogsAsString(): string {
    return this.logBuffer.join('\n');
  }

  clear(): void {
    this.logBuffer = [];
  }

  // Export logs to a downloadable file
  exportLogs(): void {
    const logs = this.getAllLogsAsString();
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify-lyrics-player-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const logger = new Logger();

// Also expose logger methods globally for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).appLogger = logger;
  console.log('Logger available as window.appLogger');
}

