/**
 * Logger Configuration
 * Centralized configuration for logging system
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SILENT: 4
};

const config = {
    // Current log level based on environment
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG),

    // Enable/disable different features
    features: {
        timestamps: true,
        colors: true,
        stackTrace: true,
        performanceTiming: true,
        lineNumbers: true,
        fallbackDetection: true
    },

    // Color codes for different log types
    colors: {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',

        // Foreground colors
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',

        // Background colors
        bgBlack: '\x1b[40m',
        bgRed: '\x1b[41m',
        bgGreen: '\x1b[42m',
        bgYellow: '\x1b[43m',
        bgBlue: '\x1b[44m',
        bgMagenta: '\x1b[45m',
        bgCyan: '\x1b[46m',
        bgWhite: '\x1b[47m'
    },

    // Status symbols
    symbols: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        fallback: '🔄',
        timing: '⏱',
        arrow: '→',
        bullet: '•'
    },

    // Fallback detection patterns
    fallbackPatterns: [
        /fallback/i,
        /backup/i,
        /alternative/i,
        /retry/i,
        /default.*model/i,
        /catch.*block/i
    ]
};

module.exports = {
    LOG_LEVELS,
    config
};
