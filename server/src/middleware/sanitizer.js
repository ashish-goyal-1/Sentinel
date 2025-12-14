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
 * Only strips dangerous HTML tags - React handles escaping on render
 */
const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove other dangerous tags but preserve content
        .replace(/<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|option)\b[^>]*>/gi, '')
        // Remove event handlers from any remaining tags
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Trim whitespace
        .trim();
};

module.exports = { sanitizeBody, sanitizeInput };
