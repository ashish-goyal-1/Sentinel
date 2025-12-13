/**
 * Input Sanitization Middleware
 * 
 * Sanitizes all string inputs in request body to prevent XSS attacks
 */

const { sanitizeObject } = require('../utils');

/**
 * Middleware to sanitize request body
 */
const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Don't sanitize certain fields that need raw values
        const excludeFields = ['password', 'confirmPassword', 'credential'];

        const sanitized = {};
        for (const [key, value] of Object.entries(req.body)) {
            if (excludeFields.includes(key)) {
                sanitized[key] = value; // Keep raw
            } else if (typeof value === 'string') {
                sanitized[key] = sanitizeInput(value);
            } else if (Array.isArray(value)) {
                sanitized[key] = value.map(item =>
                    typeof item === 'string' ? sanitizeInput(item) : item
                );
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        req.body = sanitized;
    }
    next();
};

/**
 * Sanitize a single string value
 */
const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

module.exports = { sanitizeBody, sanitizeInput };
