import { useState } from 'react';

const RoleSelectionModal = ({ isOpen, onClose, onSelect, userInfo }) => {
    const [selectedRole, setSelectedRole] = useState(null);
    const [teacherCode, setTeacherCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setError('');
        if (role === 'STUDENT') {
            // Students don't need a code, proceed immediately
            setLoading(true);
            onSelect(role, '');
        }
    };

    const handleTeacherSubmit = () => {
        if (!teacherCode.trim()) {
            setError('Please enter the faculty access code');
            return;
        }
        setLoading(true);
        onSelect('TEACHER', teacherCode);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative glass-card p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎓</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to Sentinel!</h2>
                    <p className="text-zinc-400">
                        Hi <span className="text-white font-medium">{userInfo?.name || 'there'}</span>, how will you use Sentinel?
                    </p>
                </div>

                {/* Role Selection */}
                {!selectedRole ? (
                    <div className="space-y-4">
                        {/* Student Option */}
                        <button
                            onClick={() => handleRoleSelect('STUDENT')}
                            disabled={loading}
                            className="w-full p-4 rounded-xl border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">I'm a Student</h3>
                                    <p className="text-sm text-zinc-400">Take exams and view my scores</p>
                                </div>
                            </div>
                        </button>

                        {/* Teacher Option */}
                        <button
                            onClick={() => handleRoleSelect('TEACHER')}
                            disabled={loading}
                            className="w-full p-4 rounded-xl border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 hover:border-yellow-500/50 transition-all text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">👨‍🏫</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">I'm a Teacher</h3>
                                    <p className="text-sm text-zinc-400">Create exams and monitor students</p>
                                </div>
                            </div>
                        </button>
                    </div>
                ) : selectedRole === 'TEACHER' ? (
                    /* Teacher Code Input */
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl">
                            <label className="block text-sm font-medium text-yellow-400 mb-2">
                                🔑 Faculty Access Code
                            </label>
                            <input
                                type="password"
                                value={teacherCode}
                                onChange={(e) => {
                                    setTeacherCode(e.target.value);
                                    setError('');
                                }}
                                className="input-field"
                                placeholder="Enter admin-provided code"
                                autoFocus
                            />
                            {error && (
                                <p className="text-red-400 text-sm mt-2">{error}</p>
                            )}
                            <p className="text-xs text-zinc-500 mt-2">
                                Contact your institution administrator for the access code
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedRole(null);
                                    setTeacherCode('');
                                    setError('');
                                }}
                                className="btn-secondary flex-1"
                                disabled={loading}
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleTeacherSubmit}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Verify & Join'
                                )}
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* Loading State for Student */}
                {selectedRole === 'STUDENT' && loading && (
                    <div className="text-center py-4">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-zinc-400">Creating your account...</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <p className="text-xs text-zinc-500">
                        By continuing, you agree to Sentinel's Terms of Service
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoleSelectionModal;
