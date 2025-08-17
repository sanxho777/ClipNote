export declare class Logger {
    private context;
    private enabledLevels;
    constructor(context: string);
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    /**
     * Show user-visible toast notification
     */
    toast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;
    /**
     * Send log message to background script
     */
    private sendToBackground;
    /**
     * Create performance timer
     */
    startTimer(label: string): () => void;
    /**
     * Log with stack trace
     */
    trace(message: string, ...args: any[]): void;
    /**
     * Group related log messages
     */
    group(label: string): LogGroup;
}
export declare class LogGroup {
    private logger;
    constructor(logger: Logger, label: string, collapsed?: boolean);
    log(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    end(): void;
}
/**
 * Global error handler for unhandled exceptions
 */
export declare function setupGlobalErrorHandling(): void;
/**
 * Toast notification system for user-visible messages
 */
export declare class ToastManager {
    private container;
    private logger;
    constructor();
    show(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
    private createContainer;
    private createToastElement;
    private removeToast;
    private getBackgroundColor;
    private getIcon;
}
export declare const toastManager: ToastManager;
//# sourceMappingURL=logger.d.ts.map