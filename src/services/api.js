import axios from 'axios';
import logger from '../utils/logger';

// Use environment variable or fallback to production/development URLs
const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
        ? 'https://sentinel-api-cbsk.onrender.com/api'  // Production (Render)
        : 'http://localhost:5000/api');                  // Development

logger.info('API service initialized', {
    baseURL: API_URL,
    environment: import.meta.env.MODE
});

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token from localStorage on init
const token = localStorage.getItem('token');
if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    logger.debug('Auth token loaded from localStorage');
} else {
    logger.debug('No auth token found in localStorage');
}

// Request interceptor for logging
api.interceptors.request.use(
    (config) => {
        const startTime = performance.now();
        config.metadata = { startTime };

        logger.logRequest(
            config.method.toUpperCase(),
            config.url,
            config.data
        );

        return config;
    },
    (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
    (response) => {
        const duration = performance.now() - response.config.metadata.startTime;

        logger.logResponse(
            response.config.method.toUpperCase(),
            response.config.url,
            response.status,
            duration,
            response.data
        );

        return response;
    },
    (error) => {
        if (error.config?.metadata?.startTime) {
            const duration = performance.now() - error.config.metadata.startTime;
            const status = error.response?.status || 0;

            logger.logResponse(
                error.config.method.toUpperCase(),
                error.config.url,
                status,
                duration,
                error.response?.data
            );
        }

        if (error.response?.status === 401) {
            logger.warn('Unauthorized request - 401 response received');

            // Only redirect if we're not already on auth pages
            const isAuthPage = window.location.pathname === '/login' ||
                window.location.pathname === '/register' ||
                window.location.pathname.startsWith('/reset-password') ||
                window.location.pathname === '/forgot-password';

            if (!isAuthPage) {
                logger.info('Redirecting to login page (fallback authentication)');
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
                // Use navigate instead of hard redirect if possible, otherwise soft reload
                window.location.replace('/login');
            }
        } else {
            logger.error('API request failed', error);
        }

        return Promise.reject(error);
    }
);

export default api;

