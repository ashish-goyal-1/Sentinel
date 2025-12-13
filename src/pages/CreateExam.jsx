import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const CreateExam = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [examData, setExamData] = useState({
        title: '',
        description: '',
        duration: 30
    });
    const [questions, setQuestions] = useState([
        { text: '', options: ['', '', '', ''], correctOption: 0 }
    ]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { text: '', options: ['', '', '', ''], correctOption: 0 }
        ]);
    };

    const removeQuestion = (index) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex] = value;
        setQuestions(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!examData.title.trim()) {
            toast.error('Please enter an exam title');
            return;
        }

        const validQuestions = questions.filter(q =>
            q.text.trim() && q.options.every(o => o.trim())
        );

        if (validQuestions.length === 0) {
            toast.error('Please add at least one complete question');
            return;
        }

        setLoading(true);

        try {
            await api.post('/exams', {
                ...examData,
                questions: validQuestions
            });
            toast.success('Exam created successfully!');
            navigate('/teacher');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Navbar */}
            <nav className="glass-card sticky top-0 z-50 border-b border-white/10 rounded-none">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/teacher" className="text-2xl font-bold text-gradient">Sentinel</Link>
                    <Link to="/teacher" className="btn-secondary text-sm">
                        ← Back to Dashboard
                    </Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold mb-8">Create New Exam</h2>

                <form onSubmit={handleSubmit}>
                    {/* Exam Details Card */}
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-xl font-semibold mb-4">Exam Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Exam Title *
                                </label>
                                <input
                                    type="text"
                                    value={examData.title}
                                    onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                                    className="input-field"
                                    placeholder="e.g., Midterm Mathematics Exam"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={examData.description}
                                    onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                                    className="input-field min-h-[100px]"
                                    placeholder="Brief description of the exam..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Duration (minutes) *
                                </label>
                                <input
                                    type="number"
                                    value={examData.duration}
                                    onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) || 30 })}
                                    className="input-field w-32"
                                    min="5"
                                    max="180"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="glass-card p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold">Questions ({questions.length})</h3>
                            <button
                                type="button"
                                onClick={addQuestion}
                                className="btn-secondary text-sm"
                            >
                                + Add Question
                            </button>
                        </div>

                        <div className="space-y-6">
                            {questions.map((question, qIndex) => (
                                <div
                                    key={qIndex}
                                    className="p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-zinc-400">
                                            Question {qIndex + 1}
                                        </span>
                                        {questions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(qIndex)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={question.text}
                                            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                                            className="input-field"
                                            placeholder="Enter question text..."
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {question.options.map((option, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${qIndex}`}
                                                        checked={question.correctOption === oIndex}
                                                        onChange={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                                        className="w-4 h-4 text-indigo-600"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        className="input-field flex-1"
                                                        placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            💡 Select the radio button next to the correct answer
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-4">
                        <Link to="/teacher" className="btn-secondary">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                '✨ Create Exam'
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CreateExam;
