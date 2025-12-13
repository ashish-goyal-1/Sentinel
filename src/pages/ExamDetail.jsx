import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const ExamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        options: ['', '', '', ''],
        correctOption: 0
    });
    const [showAddQuestion, setShowAddQuestion] = useState(false);

    useEffect(() => {
        fetchExam();
    }, [id]);

    const fetchExam = async () => {
        try {
            const [examRes, submissionsRes] = await Promise.all([
                api.get(`/exams/${id}`),
                api.get(`/exams/${id}/submissions`)
            ]);
            setExam(examRes.data);
            setSubmissions(submissionsRes.data.submissions);
            setStats(submissionsRes.data.stats);
        } catch (error) {
            toast.error('Failed to fetch exam details');
            navigate('/teacher');
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestion.text.trim() || newQuestion.options.some(o => !o.trim())) {
            toast.error('Please fill all fields');
            return;
        }

        try {
            await api.post(`/exams/${id}/questions`, newQuestion);
            toast.success('Question added!');
            setNewQuestion({ text: '', options: ['', '', '', ''], correctOption: 0 });
            setShowAddQuestion(false);
            fetchExam();
        } catch (error) {
            toast.error('Failed to add question');
        }
    };

    const deleteQuestion = async (questionId) => {
        if (!confirm('Delete this question?')) return;
        try {
            await api.delete(`/questions/${questionId}`);
            toast.success('Question deleted');
            fetchExam();
        } catch (error) {
            toast.error('Failed to delete question');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/teacher" className="text-2xl font-bold text-gradient">Sentinel</Link>
                    <Link to="/teacher" className="btn-secondary text-sm">← Back</Link>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-bold">{exam?.title}</h2>
                            <span className={`px-3 py-1 rounded-full text-sm ${exam?.isActive ? 'bg-green-600/20 text-green-400' : 'bg-zinc-600/20 text-zinc-400'
                                }`}>
                                {exam?.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-zinc-400">{exam?.description || 'No description'}</p>
                        <p className="text-sm text-zinc-500 mt-2">⏱️ Duration: {exam?.duration} minutes</p>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="glass-card p-5">
                            <p className="text-zinc-400 text-sm">Total Submissions</p>
                            <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
                        </div>
                        <div className="glass-card p-5">
                            <p className="text-zinc-400 text-sm">Average Score</p>
                            <p className="text-2xl font-bold">{stats.averageScore}%</p>
                        </div>
                        <div className="glass-card p-5">
                            <p className="text-zinc-400 text-sm">Malpractice Flags</p>
                            <p className="text-2xl font-bold text-red-400">{stats.malpracticeCount}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Questions */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold">Questions ({exam?.questions?.length || 0})</h3>
                            <button
                                onClick={() => setShowAddQuestion(!showAddQuestion)}
                                className="btn-secondary text-sm"
                            >
                                {showAddQuestion ? 'Cancel' : '+ Add'}
                            </button>
                        </div>

                        {showAddQuestion && (
                            <form onSubmit={addQuestion} className="p-4 mb-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                                <input
                                    type="text"
                                    value={newQuestion.text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                    className="input-field mb-3"
                                    placeholder="Question text..."
                                />
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {newQuestion.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={newQuestion.correctOption === i}
                                                onChange={() => setNewQuestion({ ...newQuestion, correctOption: i })}
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const opts = [...newQuestion.options];
                                                    opts[i] = e.target.value;
                                                    setNewQuestion({ ...newQuestion, options: opts });
                                                }}
                                                className="input-field flex-1 py-2"
                                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button type="submit" className="btn-primary text-sm w-full">Add Question</button>
                            </form>
                        )}

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {exam?.questions?.map((q, i) => (
                                <div key={q.id} className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-medium">Q{i + 1}: {q.text}</span>
                                        <button onClick={() => deleteQuestion(q.id)} className="text-red-400 text-sm">×</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-sm text-zinc-400">
                                        {q.options.map((opt, oi) => (
                                            <span key={oi} className={oi === q.correctOption ? 'text-green-400' : ''}>
                                                {String.fromCharCode(65 + oi)}. {opt}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submissions */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-semibold mb-4">Submissions</h3>
                        {submissions.length === 0 ? (
                            <p className="text-zinc-400 text-center py-8">No submissions yet</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {submissions.map((sub) => (
                                    <div key={sub.id} className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{sub.student.name}</p>
                                            <p className="text-sm text-zinc-400">{sub.student.email}</p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {new Date(sub.submittedAt).toLocaleString()}
                                                {sub.warningsCount > 0 && (
                                                    <span className="text-yellow-400 ml-2">⚠️ {sub.warningsCount} warnings</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className={`text-2xl font-bold ${sub.percentage >= 70 ? 'text-green-400' :
                                            sub.percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {sub.percentage}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExamDetail;
