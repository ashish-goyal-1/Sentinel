/**
 * Centralized Logger Utility for Backend
 * Provides detailed logging with color-coded output, timing, and fallback detection
 */

const { LOG_LEVELS, config } = require('../config/logger.config');

class Logger {
    constructor() {
        this.startTimes = new Map();
        this.executionStack = [];
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
     * Colorize text
     */
    colorize(text, color) {
        if (!config.features.colors) return text;
        return `${color}${text}${config.colors.reset}`;
    }

    /**
     * Get caller information (file and line number)
     */
    getCallerInfo() {
        if (!config.features.lineNumbers) return '';

        const stack = new Error().stack;
        const stackLines = stack.split('\n');
        // Skip first 3 lines (Error, getCallerInfo, and the log method)
        const callerLine = stackLines[4] || stackLines[3] || '';

        // Extract file path and line number
        const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/);
        if (match) {
            const filePath = match[1].split('\\').pop().split('/').pop();
            const lineNumber = match[2];
            return this.colorize(`[${filePath}:${lineNumber}]`, config.colors.dim);
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
     * Format log message
     */
    formatMessage(level, symbol, message, data = null) {
        const timestamp = this.getTimestamp();
        const caller = this.getCallerInfo();
        const indent = '  '.repeat(this.executionStack.length);

        let formatted = `${timestamp} ${symbol} ${indent}${message}`;

        if (caller) {
            formatted += ` ${caller}`;
        }

        if (data) {
            formatted += `\n${indent}  ${config.symbols.arrow} ${JSON.stringify(data, null, 2).split('\n').join(`\n${indent}  `)}`;
        }

        return formatted;
    }

    /**
     * Start timing an operation
     */
    startTimer(label) {
        if (!config.features.performanceTiming) return;
        this.startTimes.set(label, process.hrtime.bigint());
    }

    /**
     * End timing and return duration
     */
    endTimer(label) {
        if (!config.features.performanceTiming) return null;

        const startTime = this.startTimes.get(label);
        if (!startTime) return null;

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
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
     * DEBUG level logging
     */
    debug(message, data = null) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        const symbol = this.colorize(config.symbols.bullet, config.colors.dim);
        const coloredMessage = this.colorize(message, config.colors.dim);
        console.log(this.formatMessage('DEBUG', symbol, coloredMessage, data));
    }

    /**
     * INFO level logging
     */
    info(message, data = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        const isFallback = this.isFallback(message);
        const symbol = isFallback
            ? this.colorize(config.symbols.fallback, config.colors.yellow)
            : this.colorize(config.symbols.info, config.colors.cyan);

        const coloredMessage = isFallback
            ? this.colorize(message, config.colors.yellow)
            : this.colorize(message, config.colors.cyan);

        console.log(this.formatMessage('INFO', symbol, coloredMessage, data));
    }

    /**
     * SUCCESS level logging
     */
    success(message, data = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        const symbol = this.colorize(config.symbols.success, config.colors.green);
        const coloredMessage = this.colorize(message, config.colors.green);
        console.log(this.formatMessage('SUCCESS', symbol, coloredMessage, data));
    }

    /**
     * WARN level logging
     */
    warn(message, data = null) {
        if (config.level > LOG_LEVELS.WARN) return;

        const symbol = this.colorize(config.symbols.warning, config.colors.yellow);
        const coloredMessage = this.colorize(message, config.colors.yellow);
        console.warn(this.formatMessage('WARN', symbol, coloredMessage, data));
    }

    /**
     * ERROR level logging
     */
    error(message, error = null) {
        if (config.level > LOG_LEVELS.ERROR) return;

        const symbol = this.colorize(config.symbols.error, config.colors.red);
        const coloredMessage = this.colorize(message, config.colors.red);

        let formatted = this.formatMessage('ERROR', symbol, coloredMessage);

        if (error && config.features.stackTrace) {
            const indent = '  '.repeat(this.executionStack.length);
            if (error.stack) {
                formatted += `\n${indent}  ${this.colorize('Stack Trace:', config.colors.red)}\n${indent}  ${error.stack.split('\n').join(`\n${indent}  `)}`;
            } else if (typeof error === 'object') {
                formatted += `\n${indent}  ${this.colorize('Error Details:', config.colors.red)}\n${indent}  ${JSON.stringify(error, null, 2).split('\n').join(`\n${indent}  `)}`;
            }
        }

        console.error(formatted);
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

            const timing = duration !== null
                ? ` ${this.colorize(`(${duration.toFixed(2)}ms)`, config.colors.dim)}`
                : '';

            this.success(`Completed: ${label}${timing}`);
            this.popContext();

            return result;
        } catch (error) {
            const duration = this.endTimer(timerId);
            const timing = duration !== null
                ? ` ${this.colorize(`(${duration.toFixed(2)}ms)`, config.colors.dim)}`
                : '';

            this.error(`Failed: ${label}${timing}`, error);
            this.popContext();

            throw error;
        }
    }

    /**
     * Log a divider for visual separation
     */
    divider(title = null) {
        if (config.level > LOG_LEVELS.INFO) return;

        const line = '─'.repeat(80);
        if (title) {
            const titleText = ` ${title} `;
            const padding = Math.floor((80 - titleText.length) / 2);
            const divider = '─'.repeat(padding) + titleText + '─'.repeat(80 - padding - titleText.length);
            console.log(this.colorize(divider, config.colors.dim));
        } else {
            console.log(this.colorize(line, config.colors.dim));
        }
    }

    /**
     * Log request information
     */
    logRequest(req) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        this.divider(`${req.method} ${req.path}`);
        this.debug(`Request received: ${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    /**
     * Log response information
     */
    logResponse(req, res, duration) {
        if (config.level > LOG_LEVELS.DEBUG) return;

        const statusColor = res.statusCode >= 500 ? config.colors.red
            : res.statusCode >= 400 ? config.colors.yellow
                : res.statusCode >= 300 ? config.colors.cyan
                    : config.colors.green;

        const status = this.colorize(res.statusCode.toString(), statusColor);
        const timing = this.colorize(`${duration.toFixed(2)}ms`, config.colors.dim);

        this.debug(`Response sent: ${status} ${timing}`);
    }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
