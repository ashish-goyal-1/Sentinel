/**
 * Sentinel Configuration
 * 
 * Centralized configuration for environment-based settings
 */

// Face Detection Configuration
export const FACE_DETECTION_CONFIG = {
    // Euclidean distance threshold for face matching (0-1)
    // Lower = stricter matching, Higher = more lenient
    // Default: 0.6 (recommended for most cases)
    MATCH_THRESHOLD: parseFloat(import.meta.env.VITE_FACE_MATCH_THRESHOLD) || 0.6,

    // Interval between face detections (ms)
    DETECTION_INTERVAL: parseInt(import.meta.env.VITE_FACE_DETECTION_INTERVAL) || 3000,

    // Interval between identity verification (ms)
    VERIFY_INTERVAL: parseInt(import.meta.env.VITE_FACE_VERIFY_INTERVAL) || 30000,
};

// Proctoring Configuration
export const PROCTORING_CONFIG = {
    // Maximum warnings before auto-submit
    MAX_WARNINGS: parseInt(import.meta.env.VITE_MAX_WARNINGS) || 5,

    // Enable/disable specific features
    ENABLE_FACE_DETECTION: import.meta.env.VITE_ENABLE_FACE_DETECTION !== 'false',
    ENABLE_TAB_SWITCH_DETECTION: import.meta.env.VITE_ENABLE_TAB_DETECTION !== 'false',
    ENABLE_FULLSCREEN: import.meta.env.VITE_ENABLE_FULLSCREEN !== 'false',
    ENABLE_COPY_PASTE_BLOCK: import.meta.env.VITE_ENABLE_COPY_PASTE_BLOCK !== 'false',
};

// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD
            ? 'https://sentinel-api-cbsk.onrender.com/api'
            : 'http://localhost:5000/api'),
    TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
};

// App Metadata
export const APP_CONFIG = {
    NAME: 'Sentinel',
    TAGLINE: 'AI-Powered Secure Exam Platform',
    VERSION: '1.0.0',
    AUTHOR: 'Ashish Goyal',
    GITHUB: 'https://github.com/ashish-goyal-1/Sentinel',
    LINKEDIN: 'https://www.linkedin.com/in/ashish-goyal-66422b257/',
};
