const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Submit exam with auto-grading
// @route   POST /api/exams/:examId/submit
// @access  Private/Student
const submitExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers, warningsCount, malpracticeEvents } = req.body;

        // Check if already submitted
        const existingSubmission = await prisma.submission.findUnique({
            where: {
                studentId_examId: {
                    studentId: req.user.id,
                    examId
                }
            }
        });

        if (existingSubmission) {
            return res.status(400).json({ error: 'You have already submitted this exam' });
        }

        // Get exam with questions for grading
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Auto-grade: Calculate score
        let score = 0;
        const totalQuestions = exam.questions.length;

        exam.questions.forEach(question => {
            if (answers && answers[question.id] === question.correctOption) {
                score++;
            }
        });

        // Create submission
        const submission = await prisma.submission.create({
            data: {
                score,
                totalQuestions,
                answers: answers || {},
                warningsCount: warningsCount || 0,
                malpracticeEvents: malpracticeEvents || [],
                studentId: req.user.id,
                examId
            },
            include: {
                exam: { select: { title: true } }
            }
        });

        res.status(201).json({
            ...submission,
            percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
        });
    } catch (error) {
        console.error('Submit exam error:', error);
        res.status(500).json({ error: 'Error submitting exam' });
    }
};

// @desc    Get student's submission history
// @route   GET /api/submissions
// @access  Private/Student
const getMySubmissions = async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: { studentId: req.user.id },
            include: {
                exam: {
                    select: { title: true, duration: true, teacher: { select: { name: true } } }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        // Add percentage to each submission
        const submissionsWithPercentage = submissions.map(sub => ({
            ...sub,
            percentage: sub.totalQuestions > 0
                ? Math.round((sub.score / sub.totalQuestions) * 100)
                : 0
        }));

        res.json(submissionsWithPercentage);
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Error fetching submissions' });
    }
};

// @desc    Get all submissions for an exam (Teacher only)
// @route   GET /api/exams/:examId/submissions
// @access  Private/Teacher
const getExamSubmissions = async (req, res) => {
    try {
        const { examId } = req.params;

        // Check exam ownership
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: { teacherId: true, title: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view these submissions' });
        }

        const submissions = await prisma.submission.findMany({
            where: { examId },
            include: {
                student: { select: { name: true, email: true } }
            },
            orderBy: { submittedAt: 'desc' }
        });

        // Add percentage and calculate stats
        const submissionsWithPercentage = submissions.map(sub => ({
            ...sub,
            percentage: sub.totalQuestions > 0
                ? Math.round((sub.score / sub.totalQuestions) * 100)
                : 0
        }));

        const stats = {
            totalSubmissions: submissions.length,
            averageScore: submissions.length > 0
                ? Math.round(submissions.reduce((acc, sub) =>
                    acc + (sub.score / sub.totalQuestions) * 100, 0) / submissions.length)
                : 0,
            malpracticeCount: submissions.filter(sub =>
                sub.warningsCount >= 3 || (sub.malpracticeEvents && sub.malpracticeEvents.length > 0)
            ).length
        };

        res.json({ submissions: submissionsWithPercentage, stats });
    } catch (error) {
        console.error('Get exam submissions error:', error);
        res.status(500).json({ error: 'Error fetching submissions' });
    }
};

// @desc    Get single submission details
// @route   GET /api/submissions/:id
// @access  Private
const getSubmission = async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await prisma.submission.findUnique({
            where: { id },
            include: {
                exam: {
                    include: {
                        questions: true,
                        teacher: { select: { name: true } }
                    }
                },
                student: { select: { name: true, email: true } }
            }
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Check authorization
        if (req.user.role === 'STUDENT' && submission.studentId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view this submission' });
        }

        if (req.user.role === 'TEACHER' && submission.exam.teacher.name !== req.user.name) {
            return res.status(403).json({ error: 'Not authorized to view this submission' });
        }

        res.json({
            ...submission,
            percentage: submission.totalQuestions > 0
                ? Math.round((submission.score / submission.totalQuestions) * 100)
                : 0
        });
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ error: 'Error fetching submission' });
    }
};

module.exports = { submitExam, getMySubmissions, getExamSubmissions, getSubmission };
