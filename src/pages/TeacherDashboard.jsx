import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { StatCardSkeleton, ExamCardSkeleton } from '../components/Skeleton';

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalExams: 0, totalSubmissions: 0, averageScore: 0 });

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'danger'
    });

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await api.get('/exams');
            setExams(response.data);

            // Calculate stats
            const totalExams = response.data.length;
            const totalSubmissions = response.data.reduce((acc, exam) => acc + exam._count.submissions, 0);
            setStats({ totalExams, totalSubmissions, averageScore: 0 });
        } catch (error) {
            toast.error('Failed to fetch exams');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            variant: 'warning',
            onConfirm: () => {
                logout();
                navigate('/login');
                toast.success('Logged out successfully');
            }
        });
    };

    const toggleExamStatus = async (examId, currentStatus) => {
        try {
            await api.put(`/exams/${examId}`, { isActive: !currentStatus });
            fetchExams();
            toast.success(`Exam ${currentStatus ? 'deactivated' : 'activated'}`);
        } catch (error) {
            toast.error('Failed to update exam status');
        }
    };

    const deleteExam = (examId, examTitle) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Exam',
            message: `Are you sure you want to delete "${examTitle}"? This action cannot be undone and all submissions will be lost.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/exams/${examId}`);
                    fetchExams();
                    toast.success('Exam deleted');
                } catch (error) {
                    toast.error('Failed to delete exam');
                }
            }
        });
    };

    return (
        <div className="min-h-screen">
            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                confirmText={confirmDialog.variant === 'danger' ? 'Delete' : 'Confirm'}
            />

            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gradient">Sentinel</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-zinc-400">👨‍🏫 {user?.name}</span>
                        <button onClick={handleLogout} className="btn-secondary text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
                        <p className="text-zinc-400 mt-1">Manage your exams and view submissions</p>
                    </div>
                    <Link to="/teacher/create" className="btn-primary flex items-center gap-2">
                        <span className="text-xl">+</span>
                        Create Exam
                    </Link>
                </div>

                {/* Stats Bento Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="glass-card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                    <span className="text-2xl">📝</span>
                                </div>
                                <div>
                                    <p className="text-zinc-400 text-sm">Total Exams</p>
                                    <p className="text-3xl font-bold">{stats.totalExams}</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div>
                                    <p className="text-zinc-400 text-sm">Total Submissions</p>
                                    <p className="text-3xl font-bold">{stats.totalSubmissions}</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card-hover p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <div>
                                    <p className="text-zinc-400 text-sm">Active Exams</p>
                                    <p className="text-3xl font-bold">{exams.filter(e => e.isActive).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exams List */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-semibold mb-4">Your Exams</h3>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="skeleton w-3 h-3 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="skeleton h-5 w-1/3"></div>
                                            <div className="skeleton h-4 w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="skeleton h-9 w-24"></div>
                                        <div className="skeleton h-9 w-16"></div>
                                        <div className="skeleton h-9 w-20"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-6xl mb-4 block">📚</span>
                            <p className="text-zinc-400 mb-4">No exams created yet</p>
                            <Link to="/teacher/create" className="btn-primary inline-flex items-center gap-2">
                                Create your first exam
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {exams.map((exam) => (
                                <div
                                    key={exam.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${exam.isActive ? 'bg-green-500' : 'bg-zinc-500'}`}></div>
                                        <div>
                                            <h4 className="font-medium">{exam.title}</h4>
                                            <p className="text-sm text-zinc-400">
                                                {exam._count.questions} questions • {exam.duration} min • {exam._count.submissions} submissions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleExamStatus(exam.id, exam.isActive)}
                                            className="btn-secondary text-sm px-3 py-2"
                                        >
                                            {exam.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <Link
                                            to={`/teacher/exam/${exam.id}`}
                                            className="btn-primary text-sm px-3 py-2"
                                        >
                                            View
                                        </Link>
                                        <button
                                            onClick={() => deleteExam(exam.id, exam.title)}
                                            className="btn-danger text-sm px-3 py-2"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
