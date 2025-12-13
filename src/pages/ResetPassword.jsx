import { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// Eye icons
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

// Check and X icons
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Password requirements checker
    const passwordChecks = useMemo(() => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
    }, [password]);

    // Calculate password strength
    const passwordStrength = useMemo(() => {
        const checks = Object.values(passwordChecks).filter(Boolean).length;
        if (checks === 0) return { level: 0, text: '', color: '' };
        if (checks === 1) return { level: 1, text: 'Weak', color: 'bg-red-500' };
        if (checks === 2) return { level: 2, text: 'Fair', color: 'bg-orange-500' };
        if (checks === 3) return { level: 3, text: 'Medium', color: 'bg-yellow-500' };
        return { level: 4, text: 'Strong', color: 'bg-green-500' };
    }, [passwordChecks]);

    const allRequirementsMet = Object.values(passwordChecks).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!allRequirementsMet) {
            toast.error('Please meet all password requirements');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/reset-password', { token, password });
            toast.success('Password reset successfully! Please login.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gradient mb-2">Sentinel</h1>
                    <p className="text-zinc-400">Create new password</p>
                </div>

                <div className="glass-card p-8">
                    <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-semibold mb-2">Reset Password</h2>
                    <p className="text-zinc-400 mb-6">
                        Enter your new password below.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>

                            {/* Password Strength Meter */}
                            {password && (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-zinc-400">Strength</span>
                                            <span className={`text-xs font-medium ${passwordStrength.level <= 1 ? 'text-red-400' :
                                                    passwordStrength.level === 2 ? 'text-orange-400' :
                                                        passwordStrength.level === 3 ? 'text-yellow-400' : 'text-green-400'
                                                }`}>
                                                {passwordStrength.text}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                                style={{ width: `${passwordStrength.level * 25}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-zinc-800/50 rounded-lg space-y-2">
                                        <p className="text-xs text-zinc-400 font-medium mb-2">Password Requirements:</p>
                                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.minLength ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.minLength ? <CheckIcon /> : <XIcon />}
                                            <span>At least 8 characters</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasUppercase ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.hasUppercase ? <CheckIcon /> : <XIcon />}
                                            <span>One uppercase letter (A-Z)</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasNumber ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.hasNumber ? <CheckIcon /> : <XIcon />}
                                            <span>One number (0-9)</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasSpecial ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {passwordChecks.hasSpecial ? <CheckIcon /> : <XIcon />}
                                            <span>One special character (!@#$%^&*)</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`input-field pr-12 ${confirmPassword && password !== confirmPassword
                                            ? 'border-red-500 focus:border-red-500'
                                            : confirmPassword && password === confirmPassword
                                                ? 'border-green-500 focus:border-green-500'
                                                : ''
                                        }`}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                            )}
                            {confirmPassword && password === confirmPassword && (
                                <p className="text-green-400 text-xs mt-1">Passwords match ✓</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !allRequirementsMet}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-zinc-400">
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                            Back to Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
