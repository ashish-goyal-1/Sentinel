const { Resend } = require('resend');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send password reset email
 * Uses Resend for transactional emails
 * 
 * @param {string} to - Recipient email
 * @param {string} resetLink - Password reset URL
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (to, resetLink, userName = 'User') => {
    try {
        // Check if Resend API key is configured
        if (!process.env.RESEND_API_KEY) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 PASSWORD RESET LINK (Email service not configured):');
            console.log(`   To: ${to}`);
            console.log(`   Link: ${resetLink}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('💡 To enable emails, add RESEND_API_KEY to your .env');
            return { success: true, method: 'console' };
        }

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Sentinel <noreply@resend.dev>',
            to: [to],
            subject: 'Reset Your Sentinel Password',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #fafafa; padding: 40px 20px; margin: 0;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border-radius: 16px; padding: 40px; border: 1px solid #27272a;">
                        <!-- Logo/Brand -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
                                Sentinel
                            </h1>
                            <p style="color: #71717a; margin-top: 8px; font-size: 14px;">AI-Powered Secure Exam Platform</p>
                        </div>

                        <!-- Main Content -->
                        <div style="text-align: center;">
                            <div style="width: 64px; height: 64px; background-color: rgba(99, 102, 241, 0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                                <span style="font-size: 32px;">🔐</span>
                            </div>
                            
                            <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #fafafa;">
                                Password Reset Request
                            </h2>
                            
                            <p style="color: #a1a1aa; margin: 0 0 24px 0; line-height: 1.6;">
                                Hi ${userName},<br><br>
                                We received a request to reset your password. Click the button below to create a new password.
                            </p>
                            
                            <!-- Reset Button -->
                            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
                                Reset Password
                            </a>
                            
                            <p style="color: #71717a; font-size: 13px; margin-top: 24px;">
                                This link will expire in <strong style="color: #a1a1aa;">1 hour</strong>.
                            </p>
                        </div>

                        <!-- Security Notice -->
                        <div style="margin-top: 32px; padding: 16px; background-color: #27272a; border-radius: 12px;">
                            <p style="color: #71717a; font-size: 12px; margin: 0; line-height: 1.5;">
                                🛡️ <strong style="color: #a1a1aa;">Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="margin-top: 32px; text-align: center; padding-top: 24px; border-top: 1px solid #27272a;">
                            <p style="color: #52525b; font-size: 12px; margin: 0;">
                                © 2024 Sentinel. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error(error.message);
        }

        console.log('✅ Password reset email sent via Resend:', data.id);
        return { success: true, method: 'resend', id: data.id };

    } catch (error) {
        console.error('Email service error:', error);
        throw error;
    }
};

/**
 * Send welcome email to new users
 */
const sendWelcomeEmail = async (to, userName, role) => {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.log(`📧 Welcome email for ${userName} (${role}) - API key not configured`);
            return { success: true, method: 'console' };
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Sentinel <noreply@resend.dev>',
            to: [to],
            subject: 'Welcome to Sentinel! 🎓',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                </head>
                <body style="font-family: 'Segoe UI', sans-serif; background-color: #09090b; color: #fafafa; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border-radius: 16px; padding: 40px; border: 1px solid #27272a;">
                        <div style="text-align: center;">
                            <h1 style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                                Welcome to Sentinel!
                            </h1>
                            <p style="color: #a1a1aa; margin-top: 16px;">
                                Hi ${userName}, your ${role.toLowerCase()} account has been created successfully.
                            </p>
                            <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
                                Start exploring the platform and ${role === 'TEACHER' ? 'create your first exam!' : 'take your first exam!'}
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        if (error) throw new Error(error.message);
        return { success: true, method: 'resend', id: data.id };

    } catch (error) {
        console.error('Welcome email error:', error);
        // Don't throw - welcome email failure shouldn't block registration
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail
};
