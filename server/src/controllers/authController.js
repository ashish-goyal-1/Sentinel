const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role, teacherCode } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        // Teacher Access Code validation
        if (role === 'TEACHER') {
            const validTeacherCode = process.env.TEACHER_SECRET || 'SENTINEL2024';
            if (!teacherCode || teacherCode !== validTeacherCode) {
                return res.status(403).json({ error: 'Invalid Teacher Access Code. Contact your administrator for the correct code.' });
            }
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one number' });
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one special character' });
        }

        // Check if user exists
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role === 'TEACHER' ? 'TEACHER' : 'STUDENT'
            },
            select: { id: true, name: true, email: true, role: true }
        });

        res.status(201).json({
            ...user,
            token: generateToken(user.id)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        exams: true,
                        submissions: true
                    }
                }
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { credential, role, teacherCode } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Decode the JWT from Google (the credential is a JWT)
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // Existing user - just log them in
            return res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
                isNewUser: false
            });
        }

        // New user flow
        if (!role) {
            // First call - return that this is a new user who needs to select role
            return res.json({
                isNewUser: true,
                needsRoleSelection: true,
                name,
                email
            });
        }

        // Role was provided - validate and create account
        const userRole = role.toUpperCase();

        // Teacher code validation
        if (userRole === 'TEACHER') {
            const validTeacherCode = process.env.TEACHER_SECRET || 'SENTINEL2024';
            if (!teacherCode || teacherCode !== validTeacherCode) {
                return res.status(403).json({
                    error: 'Invalid Faculty Access Code. Contact your administrator for the correct code.'
                });
            }
        }

        // Create new user with selected role
        const randomPassword = require('crypto').randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: userRole
            }
        });

        // Send welcome email (non-blocking)
        const { sendWelcomeEmail } = require('../services/emailService');
        sendWelcomeEmail(email, name, userRole).catch(err => console.error('Welcome email error:', err));

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
            isNewUser: true
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Please provide your email' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal if email exists for security
            return res.json({ message: 'If an account exists, a reset email will be sent' });
        }

        // Generate reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Save reset token to database
        await prisma.passwordReset.create({
            data: {
                token: resetToken,
                email: user.email,
                expiresAt
            }
        });

        // Send password reset email using Resend
        const { sendPasswordResetEmail } = require('../services/emailService');
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        await sendPasswordResetEmail(user.email, resetLink, user.name);

        res.json({ message: 'If an account exists, a reset email will be sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Error processing password reset request' });
    }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one number' });
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one special character' });
        }

        // Find valid reset token
        const resetRecord = await prisma.passwordReset.findFirst({
            where: {
                token,
                used: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Find user and update password
        const user = await prisma.user.findUnique({ where: { email: resetRecord.email } });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user password
        await prisma.user.update({
            where: { email: resetRecord.email },
            data: { password: hashedPassword }
        });

        // Mark token as used
        await prisma.passwordReset.update({
            where: { id: resetRecord.id },
            data: { used: true }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
};

module.exports = { register, login, getMe, googleLogin, forgotPassword, resetPassword };

