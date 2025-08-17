export class Logger {
  private context: string;
  private enabledLevels: Set<string>;

  constructor(context: string) {
    this.context = context;
    
    // Enable all levels in development, only errors in production
    this.enabledLevels = new Set(['error', 'warn', 'info', 'debug']);
  }

  error(message: string, ...args: any[]): void {
    if (this.enabledLevels.has('error')) {
      console.error(`[${this.context}] ERROR:`, message, ...args);
      
      // Also send to background script for centralized logging
      this.sendToBackground('error', message, args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.enabledLevels.has('warn')) {
      console.warn(`[${this.context}] WARN:`, message, ...args);
      this.sendToBackground('warn', message, args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.enabledLevels.has('info')) {
      console.info(`[${this.context}] INFO:`, message, ...args);
      this.sendToBackground('info', message, args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.enabledLevels.has('debug')) {
      console.debug(`[${this.context}] DEBUG:`, message, ...args);
      // Don't send debug messages to background to reduce noise
    }
  }

  /**
   * Show user-visible toast notification
   */
  toast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // Send message to background script to show notification
    this.sendToBackground('toast', message, [type]);
    
    // Also log locally
    switch (type) {
      case 'error':
        this.error(`Toast: ${message}`);
        break;
      case 'warning':
        this.warn(`Toast: ${message}`);
        break;
      default:
        this.info(`Toast: ${message}`);
        break;
    }
  }

  /**
   * Send log message to background script
   */
  private sendToBackground(level: string, message: string, args: any[]): void {
    try {
      chrome.runtime.sendMessage({
        type: 'LOG_MESSAGE',
        data: {
          level,
          context: this.context,
          message,
          args,
          timestamp: Date.now(),
          url: window.location.href
        }
      }).catch(() => {
        // Ignore errors if background script is not available
      });
    } catch (error) {
      // Ignore errors in sending logs
    }
  }

  /**
   * Create performance timer
   */
  startTimer(label: string): () => void {
    const startTime = performance.now();
    this.debug(`Timer started: ${label}`);
    
    return () => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      this.debug(`Timer finished: ${label} (${duration}ms)`);
    };
  }

  /**
   * Log with stack trace
   */
  trace(message: string, ...args: any[]): void {
    if (this.enabledLevels.has('debug')) {
      console.trace(`[${this.context}] TRACE:`, message, ...args);
    }
  }

  /**
   * Group related log messages
   */
  group(label: string): LogGroup {
    return new LogGroup(this, label);
  }
}

export class LogGroup {
  private logger: Logger;

  constructor(logger: Logger, label: string, collapsed = false) {
    this.logger = logger;
    
    if (collapsed) {
      console.groupCollapsed(`[${logger['context']}] ${label}`);
    } else {
      console.group(`[${logger['context']}] ${label}`);
    }
  }

  log(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.logger.error(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
  }

  end(): void {
    console.groupEnd();
  }
}

/**
 * Global error handler for unhandled exceptions
 */
export function setupGlobalErrorHandling(): void {
  const logger = new Logger('Global');

  window.addEventListener('error', (event) => {
    logger.error('Unhandled error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason);
  });
}

/**
 * Toast notification system for user-visible messages
 */
export class ToastManager {
  private container: HTMLElement | null = null;
  private logger = new Logger('Toast');

  constructor() {
    this.createContainer();
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000): void {
    if (!this.container) {
      this.createContainer();
    }

    const toast = this.createToastElement(message, type);
    this.container!.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // Auto remove
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.removeToast(toast);
    });

    this.logger.debug(`Showed toast: ${type} - ${message}`);
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'vehicle-scraper-toasts';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(this.container);
  }

  private createToastElement(message: string, type: string): HTMLElement {
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
      word-wrap: break-word;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.4;
    `;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
      </div>
    `;

    return toast;
  }

  private removeToast(toast: HTMLElement): void {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  private getBackgroundColor(type: string): string {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  }

  private getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }
}

// Export singleton instance
export const toastManager = new ToastManager();
