const express = require('express');
const router = express.Router();
const { register, login, getMe, googleLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// Public routes (with rate limiting)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;


