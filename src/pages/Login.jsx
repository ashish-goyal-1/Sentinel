import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import RoleSelectionModal from '../components/RoleSelectionModal';
import api from '../services/api';

// Eye icons as SVG components
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

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Google OAuth state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [pendingCredential, setPendingCredential] = useState(null);
    const [newUserInfo, setNewUserInfo] = useState(null);

    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name}!`);
            navigate(user.role === 'TEACHER' ? '/teacher' : '/student');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const result = await loginWithGoogle(credentialResponse.credential);

            // Check if this is a new user needing role selection
            if (result.needsRoleSelection) {
                setPendingCredential(credentialResponse.credential);
                setNewUserInfo({ name: result.name, email: result.email });
                setShowRoleModal(true);
            } else {
                // Existing user - navigate directly
                toast.success(`Welcome back, ${result.name}!`);
                navigate(result.role === 'TEACHER' ? '/teacher' : '/student');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Google login failed');
        }
    };

    const handleRoleSelect = async (role, teacherCode) => {
        try {
            const result = await loginWithGoogle(pendingCredential, role, teacherCode);

            if (result.token) {
                toast.success(`Welcome to Sentinel, ${result.name}!`);
                setShowRoleModal(false);
                navigate(result.role === 'TEACHER' ? '/teacher' : '/student');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create account');
            // Keep modal open so user can retry
        }
    };

    const handleGoogleError = () => {
        toast.error('Google login failed. Please try again.');
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gradient mb-2">Sentinel</h1>
                        <p className="text-zinc-400">AI-Powered Secure Exam Platform</p>
                    </div>

                    {/* Login Card */}
                    <div className="glass-card p-8">
                        <h2 className="text-2xl font-semibold mb-6">Welcome Back</h2>

                        {/* Google Login Button */}
                        <div className="mb-6">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme="filled_black"
                                size="large"
                                width="100%"
                                text="continue_with"
                                shape="rectangular"
                            />
                        </div>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-zinc-900 text-zinc-500">or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Password
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
                                <div className="flex justify-end mt-1">
                                    <Link to="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-zinc-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Role Selection Modal for new Google users */}
            <RoleSelectionModal
                isOpen={showRoleModal}
                onClose={() => {
                    setShowRoleModal(false);
                    setPendingCredential(null);
                    setNewUserInfo(null);
                }}
                onSelect={handleRoleSelect}
                userInfo={newUserInfo}
            />
        </>
    );
};

export default Login;
