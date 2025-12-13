import axios from 'axios';

// Use environment variable or fallback to production/development URLs
const API_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD 
        ? 'https://sentinel-api-cbsk.onrender.com/api'  // Production (Render)
        : 'http://localhost:5000/api');                  // Development

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
}

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
