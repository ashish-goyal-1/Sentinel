/**
 * Frontend Logger Configuration
 * Configuration for browser-based logging
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
    level: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.MODE === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG),

    // Enable/disable different features
    features: {
        timestamps: true,
        colors: true,
        stackTrace: true,
        performanceTiming: true,
        componentTracking: true,
        networkTracking: true,
        fallbackDetection: true
    },

    // Console styling
    styles: {
        debug: 'color: #9ca3af; font-weight: normal;',
        info: 'color: #06b6d4; font-weight: normal;',
        success: 'color: #22c55e; font-weight: bold;',
        warn: 'color: #f59e0b; font-weight: bold;',
        error: 'color: #ef4444; font-weight: bold;',
        fallback: 'color: #f59e0b; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 3px;',
        timing: 'color: #6b7280; font-style: italic;',
        context: 'color: #8b5cf6; font-weight: normal;',
        header: 'color: #4f46e5; font-weight: bold; font-size: 14px; padding: 4px 8px; background: #e0e7ff; border-radius: 4px;'
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
        bullet: '•',
        component: '⚛',
        network: '🌐'
    },

    // Fallback detection patterns
    fallbackPatterns: [
        /fallback/i,
        /backup/i,
        /alternative/i,
        /retry/i,
        /default.*model/i,
        /catch.*block/i,
        /error.*handling/i
    ]
};

export {
    LOG_LEVELS,
    config
};
