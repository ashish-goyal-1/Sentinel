import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api';

const Analytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [suspiciousStudents, setSuspiciousStudents] = useState([]);
    const [examPerformance, setExamPerformance] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch all analytics data in parallel
            const [overviewRes, suspiciousRes, performanceRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/analytics/suspicious-students'),
                api.get('/analytics/exam-performance')
            ]);

            setOverview(overviewRes.data.overview);
            setSuspiciousStudents(suspiciousRes.data.suspiciousStudents || []);
            setExamPerformance(performanceRes.data.examPerformance || []);
        } catch (error) {
            toast.error('Failed to load analytics');
            console.error('Analytics error:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading) {
        return (
            <div className="min-h-screen">
                <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link to="/teacher" className="text-2xl font-bold text-gradient">Sentinel</Link>
                        <Link to="/teacher" className="btn-secondary text-sm">← Dashboard</Link>
                    </div>
                </nav>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/teacher" className="text-2xl font-bold text-gradient">Sentinel</Link>
                    <div className="flex items-center gap-4">
                        <Link to="/teacher" className="btn-secondary text-sm">← Dashboard</Link>
                        <span className="text-zinc-400">👨‍🏫 {user?.name}</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h1>
                    <p className="text-zinc-400">Deep dive into exam performance and student behavior</p>
                    <div className="mt-4 p-3 bg-indigo-600/10 border border-indigo-600/30 rounded-lg inline-block">
                        <p className="text-xs text-indigo-300">
                            💡 <strong>Resume Flex:</strong> This data is fetched using <code className="bg-zinc-800 px-1 rounded">prisma.$queryRaw</code> with complex SQL aggregations
                        </p>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Total Students</p>
                        <p className="text-3xl font-bold text-blue-400">{overview?.total_students || 0}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Total Teachers</p>
                        <p className="text-3xl font-bold text-yellow-400">{overview?.total_teachers || 0}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Total Exams</p>
                        <p className="text-3xl font-bold text-green-400">{overview?.total_exams || 0}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Submissions</p>
                        <p className="text-3xl font-bold text-purple-400">{overview?.total_submissions || 0}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-zinc-400 text-sm mb-1">Avg Score</p>
                        <p className="text-3xl font-bold text-indigo-400">
                            {Number(overview?.avg_score_percentage || 0).toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Exam Performance Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">📈 Your Exam Performance</h3>
                        {examPerformance.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={examPerformance.slice(0, 5)}>
                                        <XAxis
                                            dataKey="title"
                                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                            tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                                        />
                                        <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#18181b',
                                                border: '1px solid #27272a',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar dataKey="avg_score_percent" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Score %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No exam data available yet
                            </div>
                        )}
                    </div>

                    {/* Submission Distribution */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">📊 Submissions by Exam</h3>
                        {examPerformance.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={examPerformance.slice(0, 5).map(e => ({
                                                name: e.title,
                                                value: e.submission_count
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, value }) => `${name.slice(0, 10)}...: ${value}`}
                                        >
                                            {examPerformance.slice(0, 5).map((_, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No submission data available yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Suspicious Students Table */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">⚠️ Students with Warnings</h3>
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                            SQL: JOIN, GROUP BY, HAVING, SUM, AVG
                        </span>
                    </div>

                    {suspiciousStudents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Student</th>
                                        <th className="text-center py-3 px-4 text-zinc-400 font-medium">Exams Taken</th>
                                        <th className="text-center py-3 px-4 text-zinc-400 font-medium">Avg Score</th>
                                        <th className="text-center py-3 px-4 text-zinc-400 font-medium">Total Warnings</th>
                                        <th className="text-center py-3 px-4 text-zinc-400 font-medium">Risk Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suspiciousStudents.map((student, index) => (
                                        <tr key={student.id || index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium">{student.name}</p>
                                                    <p className="text-xs text-zinc-500">{student.email}</p>
                                                </div>
                                            </td>
                                            <td className="text-center py-3 px-4">{student.exams_taken}</td>
                                            <td className="text-center py-3 px-4">
                                                <span className={`font-medium ${student.avg_score_percent >= 70 ? 'text-green-400' :
                                                        student.avg_score_percent >= 50 ? 'text-yellow-400' : 'text-red-400'
                                                    }`}>
                                                    {Number(student.avg_score_percent).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <span className="text-yellow-400 font-bold">{student.total_warnings}</span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.risk_level === 'HIGH' ? 'bg-red-600/20 text-red-400' :
                                                        student.risk_level === 'MEDIUM' ? 'bg-yellow-600/20 text-yellow-400' :
                                                            'bg-green-600/20 text-green-400'
                                                    }`}>
                                                    {student.risk_level}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-500">
                            <p className="text-4xl mb-2">✅</p>
                            <p>No students with warnings yet. Great job!</p>
                        </div>
                    )}
                </div>

                {/* SQL Query Info Footer */}
                <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-white/10">
                    <p className="text-xs text-zinc-500 text-center">
                        🔧 This analytics dashboard demonstrates SQL proficiency using <code className="bg-zinc-800 px-1 rounded">prisma.$queryRaw</code>
                        with JOINs, GROUP BY, HAVING, aggregate functions (COUNT, SUM, AVG), and CASE statements.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Analytics;
