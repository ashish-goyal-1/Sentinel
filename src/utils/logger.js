/**
 * Centralized Logger Utility for Frontend
 * Provides detailed logging with styled console output, timing, and fallback detection
 */

import { LOG_LEVELS, config } from '../config/logger.config';

class Logger {
    constructor() {
        this.startTimes = new Map();
        this.executionStack = [];
        this.componentStack = [];
    }

    /**
     * Get formatted timestamp
     */
    getTimestamp() {
        if (!config.features.timestamps) return '';
        const now = new Date();
        return `[${now.toLocaleTimeString('en-US', { hour12: false })}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
    }

    /**
     * Get caller information
     */
    getCallerInfo() {
        const stack = new Error().stack;
        const stackLines = stack.split('\n');
        // Skip first 3 lines
        const callerLine = stackLines[4] || stackLines[3] || '';

        // Extract file path and line number
        const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/);
        if (match) {
            const filePath = match[1].split('/').pop();
            const lineNumber = match[2];
            return `[${filePath}:${lineNumber}]`;
        }
        return '';
    }

    /**
     * Check if message contains fallback patterns
     */
    isFallback(message) {
        if (!config.features.fallbackDetection) return false;
        return config.fallbackPatterns.some(pattern => pattern.test(message));
    }

    /**
     * Format log message with context
     */
    formatMessage(symbol, message) {
        const timestamp = this.getTimestamp();
        const caller = this.getCallerInfo();
        const indent = '  '.repeat(this.executionStack.length);

        let formatted = `${timestamp} ${symbol} ${indent}${message}`;

        if (caller) {
            formatted += ` ${caller}`;
        }

        return formatted;
    }

    /**
     * Start timing an operation
     */
    startTimer(label) {
        if (!config.features.performanceTiming) return;
        this.startTimes.set(label, performance.now());
    }

    /**
     * End timing and return duration
     */
    endTimer(label) {
        if (!config.features.performanceTiming) return null;

        const startTime = this.startTimes.get(label);
        if (!startTime) return null;

        const duration = performance.now() - startTime;
        this.startTimes.delete(label);

        return duration;
    }

    /**
     * Push execution context
     */
    pushContext(context) {
        this.executionStack.push(context);
    }

    /**
     * Pop execution context
     */
    popContext() {
        return this.executionStack.pop();
    }

    /**
     * Push component context
     */
    pushComponent(componentName) {
        if (!config.features.componentTracking) return;
        this.componentStack.push(componentName);
    }

    /**
     * Pop component context
     */
    popComponent() {
        if (!config.features.componentTracking) return;
        return this.componentStack.pop();
    }

    /**
     * Get current component context
     */
    getCurrentComponent() {
        return this.componentStack[this.componentStack.length - 1] || null;
    }

    /**
     * DEBUG level logging
     */
    debug(message, data = null) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        const formatted = this.formatMessage(config.symbols.bullet, message);
        console.log(`%c${formatted}`, config.styles.debug);

        if (data) {
            console.log(`%c  ${config.symbols.arrow}`, config.styles.debug, data);
        }
    }

    /**
     * INFO level logging
     */
    info(message, data = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        const isFallback = this.isFallback(message);
        const symbol = isFallback ? config.symbols.fallback : config.symbols.info;
        const style = isFallback ? config.styles.fallback : config.styles.info;

        const formatted = this.formatMessage(symbol, message);
        console.log(`%c${formatted}`, style);

        if (data) {
            console.log(`%c  ${config.symbols.arrow}`, style, data);
        }
    }

    /**
     * SUCCESS level logging
     */
    success(message, data = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        const formatted = this.formatMessage(config.symbols.success, message);
        console.log(`%c${formatted}`, config.styles.success);

        if (data) {
            console.log(`%c  ${config.symbols.arrow}`, config.styles.success, data);
        }
    }

    /**
     * WARN level logging
     */
    warn(message, data = null) {
        if (config.level > LOG_LEVELS.WARN) return;

        const formatted = this.formatMessage(config.symbols.warning, message);
        console.warn(`%c${formatted}`, config.styles.warn);

        if (data) {
            console.warn(`%c  ${config.symbols.arrow}`, config.styles.warn, data);
        }
    }

    /**
     * ERROR level logging
     */
    error(message, error = null) {
        if (config.level > LOG_LEVELS.ERROR) return;

        const formatted = this.formatMessage(config.symbols.error, message);
        console.error(`%c${formatted}`, config.styles.error);

        if (error && config.features.stackTrace) {
            if (error.stack) {
                console.error('%cStack Trace:', config.styles.error);
                console.error(error.stack);
            } else if (typeof error === 'object') {
                console.error('%cError Details:', config.styles.error, error);
            }
        }
    }

    /**
     * Log execution of a function with timing
     */
    async logExecution(label, fn, context = {}) {
        const timerId = `exec_${label}_${Date.now()}`;

        this.pushContext(label);
        this.info(`Starting: ${label}`, context);
        this.startTimer(timerId);

        try {
            const result = await fn();
            const duration = this.endTimer(timerId);

            const timing = duration !== null ? ` (${duration.toFixed(2)}ms)` : '';
            this.success(`Completed: ${label}${timing}`);
            this.popContext();

            return result;
        } catch (error) {
            const duration = this.endTimer(timerId);
            const timing = duration !== null ? ` (${duration.toFixed(2)}ms)` : '';

            this.error(`Failed: ${label}${timing}`, error);
            this.popContext();

            throw error;
        }
    }

    /**
     * Log component lifecycle
     */
    logComponent(componentName, lifecycle, props = null) {
        if (!config.features.componentTracking) return;
        if (config.level > LOG_LEVELS.DEBUG) return;

        const message = `${config.symbols.component} ${componentName} - ${lifecycle}`;
        console.log(`%c${this.formatMessage('', message)}`, config.styles.context);

        if (props && lifecycle === 'mounted') {
            console.log(`%c  Props:`, config.styles.context, props);
        }
    }

    /**
     * Log network request
     */
    logRequest(method, url, data = null) {
        if (!config.features.networkTracking) return;
        if (config.level > LOG_LEVELS.DEBUG) return;

        const message = `${config.symbols.network} ${method} ${url}`;
        console.log(`%c${this.formatMessage('', message)}`, config.styles.info);

        if (data) {
            console.log(`%c  Request Data:`, config.styles.info, data);
        }
    }

    /**
     * Log network response
     */
    logResponse(method, url, status, duration, data = null) {
        if (!config.features.networkTracking) return;
        if (config.level > LOG_LEVELS.DEBUG) return;

        const style = status >= 500 ? config.styles.error
            : status >= 400 ? config.styles.warn
                : config.styles.success;

        const message = `${config.symbols.network} ${method} ${url} - ${status} (${duration.toFixed(2)}ms)`;
        console.log(`%c${this.formatMessage('', message)}`, style);

        if (data && config.level === LOG_LEVELS.DEBUG) {
            console.log(`%c  Response Data:`, style, data);
        }
    }

    /**
     * Log a divider for visual separation
     */
    divider(title = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        if (title) {
            console.log(`%c━━━━━ ${title} ━━━━━`, config.styles.header);
        } else {
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', config.styles.debug);
        }
    }

    /**
     * Group related logs
     */
    group(label, collapsed = false) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        if (collapsed) {
            console.groupCollapsed(`%c${label}`, config.styles.header);
        } else {
            console.group(`%c${label}`, config.styles.header);
        }
    }

    /**
     * End group
     */
    groupEnd() {
        if (config.level > LOG_LEVELS.DEBUG) return;
        console.groupEnd();
    }

    /**
     * Log table data
     */
    table(data, columns = null) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        if (columns) {
            console.table(data, columns);
        } else {
            console.table(data);
        }
    }
}

// Export singleton instance
const logger = new Logger();

export default logger;
