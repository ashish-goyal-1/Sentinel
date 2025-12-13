import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SubmissionHistory = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get('/submissions');
                setSubmissions(response.data);
            } catch (error) {
                toast.error('Failed to fetch history');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
        toast.success('Logged out');
    };

    const averageScore = submissions.length > 0
        ? Math.round(submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length)
        : 0;

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/student" className="text-2xl font-bold text-gradient">Sentinel</Link>
                    <div className="flex items-center gap-4">
                        <Link to="/student" className="btn-secondary text-sm">← Dashboard</Link>
                        <span className="text-zinc-400">🎓 {user?.name}</span>
                        <button onClick={handleLogout} className="btn-secondary text-sm">Logout</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold">Submission History</h2>
                    <p className="text-zinc-400 mt-1">View all your past exam results</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                <span className="text-2xl">📝</span>
                            </div>
                            <div>
                                <p className="text-zinc-400 text-sm">Total Exams</p>
                                <p className="text-3xl font-bold">{submissions.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card-hover p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
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
                                    {submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-semibold mb-4">All Submissions</h3>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton h-20 w-full"></div>
                            ))}
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">📚</span>
                            <p className="text-zinc-400 mb-4">No exams taken yet</p>
                            <Link to="/student" className="btn-primary inline-block">Take your first exam</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map((submission) => (
                                <Link
                                    key={submission.id}
                                    to={`/student/results/${submission.id}`}
                                    className="block p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all hover:scale-[1.01]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-medium mb-1">{submission.exam.title}</h4>
                                            <p className="text-sm text-zinc-400">
                                                👨‍🏫 {submission.exam.teacher?.name} • ⏱️ {submission.exam.duration} min
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                📅 {new Date(submission.submittedAt).toLocaleString()}
                                                {submission.warningsCount > 0 && (
                                                    <span className="text-yellow-400 ml-3">⚠️ {submission.warningsCount} warnings</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-3xl font-bold ${submission.percentage >= 70 ? 'text-green-400' :
                                                submission.percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                {submission.percentage}%
                                            </div>
                                            <p className="text-sm text-zinc-500">
                                                {submission.score}/{submission.totalQuestions} correct
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SubmissionHistory;
