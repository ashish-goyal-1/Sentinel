import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import FaceRegistration from '../components/FaceRegistration';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Face registration state
    const [faceStatus, setFaceStatus] = useState({ registered: false, registeredAt: null, loading: true });
    const [showFaceRegistration, setShowFaceRegistration] = useState(false);

    useEffect(() => {
        fetchData();
        checkFaceStatus();
    }, []);

    // Check face registration status
    const checkFaceStatus = async () => {
        try {
            const response = await api.get('/users/face-status');
            setFaceStatus({
                registered: response.data.hasFaceRegistered,
                registeredAt: response.data.registeredAt,
                loading: false
            });
        } catch (error) {
            console.error('Face status check error:', error);
            setFaceStatus(prev => ({ ...prev, loading: false }));
        }
    };

    const fetchData = async () => {
        try {
            const [examsRes, historyRes] = await Promise.all([
                api.get('/exams'),
                api.get('/submissions')
            ]);
            setExams(examsRes.data);
            setHistory(historyRes.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        toast.success('Logged out successfully');
    };

    const averageScore = history.length > 0
        ? Math.round(history.reduce((acc, h) => acc + h.percentage, 0) / history.length)
        : 0;

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gradient">Sentinel</h1>
                    <div className="flex items-center gap-4">
                        <Link to="/student/history" className="btn-secondary text-sm">
                            📊 History
                        </Link>
                        <span className="text-zinc-400">🎓 {user?.name}</span>
                        <button onClick={handleLogout} className="btn-secondary text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h2>
                    <p className="text-zinc-400 mt-1">Ready to take your next exam?</p>
                </div>

                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                <span className="text-2xl">📝</span>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-sm">Available Exams</p>
                                <p className="text-3xl font-bold">{exams.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-sm">Completed</p>
                                <p className="text-3xl font-bold">{history.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-sm">Average Score</p>
                                <p className="text-3xl font-bold">{averageScore}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
                                <span className="text-2xl">🏆</span>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-sm">Best Score</p>
                                <p className="text-3xl font-bold">
                                    {history.length > 0 ? Math.max(...history.map(h => h.percentage)) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Face Verification Card */}
                <div className="glass-card p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${faceStatus.registered ? 'bg-green-600/20' : 'bg-yellow-600/20'
                                }`}>
                                <span className="text-2xl">{faceStatus.registered ? '✅' : '👤'}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Face Verification</h3>
                                {faceStatus.loading ? (
                                    <p className="text-zinc-400 text-sm">Checking status...</p>
                                ) : faceStatus.registered ? (
                                    <p className="text-green-400 text-sm">
                                        Registered {faceStatus.registeredAt && `on ${new Date(faceStatus.registeredAt).toLocaleDateString()}`}
                                    </p>
                                ) : (
                                    <p className="text-yellow-400 text-sm">Not registered — required before taking exams</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowFaceRegistration(true)}
                            disabled={faceStatus.loading}
                            className={`${faceStatus.registered ? 'btn-secondary' : 'btn-primary'} text-sm flex items-center gap-2`}
                        >
                            {faceStatus.registered ? (
                                <>🔄 Re-register</>
                            ) : (
                                <>📸 Register Face</>
                            )}
                        </button>
                    </div>
                    {!faceStatus.registered && !faceStatus.loading && (
                        <p className="text-xs text-zinc-500 mt-3">
                            💡 Tip: Register your face now to avoid delays when starting an exam
                        </p>
                    )}
                </div>

                {/* Available Exams */}
                <div className="glass-card p-6 mb-8">
                    <h3 className="text-xl font-semibold mb-4">Available Exams</h3>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="skeleton h-32 w-full"></div>
                            ))}
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">🎉</span>
                            <p className="text-zinc-400">No pending exams. You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {exams.map((exam) => (
                                <div
                                    key={exam.id}
                                    className="glass-card-hover p-6 flex flex-col justify-between"
                                >
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2">{exam.title}</h4>
                                        <p className="text-zinc-400 text-sm mb-4">
                                            {exam.description || 'No description provided'}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-zinc-500">
                                            <span>📝 {exam._count.questions} questions</span>
                                            <span>⏱️ {exam.duration} min</span>
                                            <span>👨‍🏫 {exam.teacher.name}</span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/student/exam/${exam.id}`}
                                        className="btn-primary mt-4 text-center"
                                    >
                                        Start Exam
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Results */}
                {history.length > 0 && (
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold">Recent Results</h3>
                            <Link to="/student/history" className="text-indigo-400 hover:text-indigo-300 text-sm">
                                View all →
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {history.slice(0, 3).map((submission) => (
                                <Link
                                    key={submission.id}
                                    to={`/student/results/${submission.id}`}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all"
                                >
                                    <div>
                                        <h4 className="font-medium">{submission.exam.title}</h4>
                                        <p className="text-sm text-zinc-400">
                                            {new Date(submission.submittedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`text-2xl font-bold ${submission.percentage >= 70 ? 'text-green-400' :
                                        submission.percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {submission.percentage}%
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Face Registration Modal */}
            <FaceRegistration
                isOpen={showFaceRegistration}
                onClose={() => setShowFaceRegistration(false)}
                onSuccess={() => {
                    setShowFaceRegistration(false);
                    checkFaceStatus(); // Refresh status after successful registration
                    toast.success('Face registered successfully!');
                }}
            />
        </div>
    );
};

export default StudentDashboard;
