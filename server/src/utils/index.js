/**
 * Server-side Utility Functions for Sentinel
 */

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Sanitize user input to prevent XSS
 * Only strips dangerous HTML tags - React handles escaping on render
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
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

/**
 * Sanitize an object's string properties
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
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
    return sanitized;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Get copyright year (dynamic)
 * @returns {number} Current year
 */
const getCopyrightYear = () => {
    return new Date().getFullYear();
};

/**
 * Generate exam access code
 * @returns {string} 6-character code
 */
const generateExamCode = () => {
    return generateRandomString(6).toUpperCase();
};

module.exports = {
    generateRandomString,
    sanitizeInput,
    sanitizeObject,
    isValidEmail,
    getCopyrightYear,
    generateExamCode
};
