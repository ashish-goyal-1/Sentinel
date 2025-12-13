import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';

const Results = () => {
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const response = await api.get(`/submissions/${id}`);
                setSubmission(response.data);
            } catch (error) {
                toast.error('Failed to load results');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const correct = submission?.score || 0;
    const incorrect = (submission?.totalQuestions || 0) - correct;
    const percentage = submission?.percentage || 0;

    const pieData = [
        { name: 'Correct', value: correct, color: '#22c55e' },
        { name: 'Incorrect', value: incorrect, color: '#ef4444' }
    ];

    const getGrade = (pct) => {
        if (pct >= 90) return { grade: 'A+', color: 'text-green-400', message: 'Outstanding!' };
        if (pct >= 80) return { grade: 'A', color: 'text-green-400', message: 'Excellent work!' };
        if (pct >= 70) return { grade: 'B', color: 'text-blue-400', message: 'Good job!' };
        if (pct >= 60) return { grade: 'C', color: 'text-yellow-400', message: 'Keep practicing!' };
        if (pct >= 50) return { grade: 'D', color: 'text-orange-400', message: 'Room for improvement' };
        return { grade: 'F', color: 'text-red-400', message: 'Study harder next time' };
    };

    const gradeInfo = getGrade(percentage);

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/student" className="text-2xl font-bold text-gradient">Sentinel</Link>
                    <Link to="/student" className="btn-secondary text-sm">← Dashboard</Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Result Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">{submission?.exam?.title}</h2>
                    <p className="text-zinc-400">Your exam has been submitted successfully!</p>
                </div>

                {/* Score Display */}
                <div className="glass-card p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Score Circle */}
                        <div className="text-center">
                            <div className={`inline-flex flex-col items-center justify-center w-48 h-48 rounded-full border-8 ${percentage >= 70 ? 'border-green-500' :
                                percentage >= 40 ? 'border-yellow-500' : 'border-red-500'
                                }`}>
                                <span className="text-5xl font-bold">{percentage}%</span>
                                <span className={`text-2xl font-bold mt-1 ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                            </div>
                            <p className="mt-4 text-xl text-zinc-300">{gradeInfo.message}</p>
                        </div>

                        {/* Pie Chart */}
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm">Score</p>
                        <p className="text-2xl font-bold">{correct}/{submission?.totalQuestions}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm">Correct</p>
                        <p className="text-2xl font-bold text-green-400">{correct}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm">Incorrect</p>
                        <p className="text-2xl font-bold text-red-400">{incorrect}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm">Warnings</p>
                        <p className={`text-2xl font-bold ${submission?.warningsCount > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                            {submission?.warningsCount || 0}
                        </p>
                    </div>
                </div>

                {/* Question Review */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-semibold mb-4">Question Review</h3>
                    <div className="space-y-4">
                        {submission?.exam?.questions?.map((question, index) => {
                            const userAnswer = submission.answers?.[question.id];
                            const isCorrect = userAnswer === question.correctOption;

                            return (
                                <div
                                    key={question.id}
                                    className={`p-4 rounded-xl border ${isCorrect ? 'border-green-600/50 bg-green-600/10' : 'border-red-600/50 bg-red-600/10'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${isCorrect ? 'bg-green-600' : 'bg-red-600'
                                            }`}>
                                            {isCorrect ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium">Q{index + 1}: {question.text}</p>
                                        </div>
                                    </div>
                                    <div className="ml-9 space-y-2 text-sm">
                                        {question.options?.map((option, optIndex) => (
                                            <div
                                                key={optIndex}
                                                className={`p-2 rounded-lg ${optIndex === question.correctOption
                                                    ? 'bg-green-600/20 text-green-400'
                                                    : optIndex === userAnswer && !isCorrect
                                                        ? 'bg-red-600/20 text-red-400'
                                                        : 'text-zinc-400'
                                                    }`}
                                            >
                                                {String.fromCharCode(65 + optIndex)}. {option}
                                                {optIndex === question.correctOption && ' ✓'}
                                                {optIndex === userAnswer && optIndex !== question.correctOption && ' (Your answer)'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <Link to="/student" className="btn-primary inline-block">
                        Back to Dashboard
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default Results;
