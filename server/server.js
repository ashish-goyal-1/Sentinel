require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import logger
const logger = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const examRoutes = require('./src/routes/examRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const userRoutes = require('./src/routes/userRoutes');

// Import middleware
const { sanitizeBody } = require('./src/middleware/sanitizer');

const app = express();

logger.divider('SERVER INITIALIZATION');
logger.info('Loading environment configuration');
logger.debug('Environment variables loaded', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 5000
});

// Allowed origins for CORS
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://sentinel-seven-smoky.vercel.app' // Production
].filter(Boolean);

logger.info('CORS configuration loaded', { allowedOrigins });

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();

    logger.logRequest(req);

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        logger.logResponse(req, res, duration);
        originalSend.call(this, data);
    };

    next();
});

// Middleware
logger.info('Configuring middleware');
app.use(cors({
    origin: function (origin, callback) {
        logger.debug('CORS check', { origin });

        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
            logger.debug('Request with no origin - allowed');
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            logger.debug('Origin allowed', { origin });
            callback(null, true);
        } else {
            logger.warn('Origin blocked by CORS', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for face descriptor data
logger.success('JSON parser configured (limit: 50mb)');

app.use(sanitizeBody); // XSS protection - sanitize all inputs
logger.success('XSS sanitization middleware enabled');

// Health check route
app.get('/api/health', (req, res) => {
    logger.debug('Health check requested');
    res.json({ status: 'ok', message: 'Sentinel Server is running' });
});

// API Routes
logger.info('Registering API routes');
app.use('/api/auth', authRoutes);
logger.success('Auth routes registered');

app.use('/api/exams', examRoutes);
logger.success('Exam routes registered');

app.use('/api/questions', questionRoutes);
logger.success('Question routes registered');

app.use('/api/submissions', submissionRoutes);
logger.success('Submission routes registered');

app.use('/api/analytics', analyticsRoutes);
logger.success('Analytics routes registered');

app.use('/api/users', userRoutes);
logger.success('User routes registered');

// 404 handler
app.use((req, res) => {
    logger.warn('Route not found', {
        method: req.method,
        path: req.path
    });
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error occurred', err);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.divider('SERVER STARTED');
    logger.success(`Sentinel Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API Base URL: http://localhost:${PORT}/api`);
    logger.divider();
});

