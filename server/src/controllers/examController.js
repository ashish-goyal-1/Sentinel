const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
const createExam = async (req, res) => {
    try {
        const { title, description, duration, questions } = req.body;

        if (!title || !duration) {
            return res.status(400).json({ error: 'Title and duration are required' });
        }

        const exam = await prisma.exam.create({
            data: {
                title,
                description,
                duration: parseInt(duration),
                teacherId: req.user.id,
                questions: questions ? {
                    create: questions.map(q => ({
                        text: q.text,
                        options: q.options,
                        correctOption: q.correctOption
                    }))
                } : undefined
            },
            include: {
                questions: true,
                teacher: { select: { name: true, email: true } }
            }
        });

        res.status(201).json(exam);
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ error: 'Error creating exam' });
    }
};

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
const getExams = async (req, res) => {
    try {
        let exams;

        if (req.user.role === 'TEACHER') {
            // Teachers see only their exams
            exams = await prisma.exam.findMany({
                where: { teacherId: req.user.id },
                include: {
                    _count: { select: { questions: true, submissions: true } },
                    teacher: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // Students see all active exams they haven't taken
            const takenExamIds = await prisma.submission.findMany({
                where: { studentId: req.user.id },
                select: { examId: true }
            });

            exams = await prisma.exam.findMany({
                where: {
                    isActive: true,
                    id: { notIn: takenExamIds.map(s => s.examId) }
                },
                include: {
                    _count: { select: { questions: true } },
                    teacher: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        res.json(exams);
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ error: 'Error fetching exams' });
    }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
const getExam = async (req, res) => {
    try {
        const { id } = req.params;

        const exam = await prisma.exam.findUnique({
            where: { id },
            include: {
                questions: req.user.role === 'TEACHER' ? true : {
                    select: { id: true, text: true, options: true } // Hide correct answer for students
                },
                teacher: { select: { name: true, email: true } },
                _count: { select: { submissions: true } }
            }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Check if student already took this exam
        if (req.user.role === 'STUDENT') {
            const existingSubmission = await prisma.submission.findUnique({
                where: {
                    studentId_examId: {
                        studentId: req.user.id,
                        examId: id
                    }
                }
            });

            if (existingSubmission) {
                return res.status(400).json({
                    error: 'You have already taken this exam',
                    submission: existingSubmission
                });
            }
        }

        res.json(exam);
    } catch (error) {
        console.error('Get exam error:', error);
        res.status(500).json({ error: 'Error fetching exam' });
    }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private/Teacher
const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, duration, isActive } = req.body;

        // Check ownership
        const exam = await prisma.exam.findUnique({
            where: { id },
            select: { teacherId: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this exam' });
        }

        const updatedExam = await prisma.exam.update({
            where: { id },
            data: {
                title,
                description,
                duration: duration ? parseInt(duration) : undefined,
                isActive
            },
            include: {
                questions: true,
                _count: { select: { submissions: true } }
            }
        });

        res.json(updatedExam);
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({ error: 'Error updating exam' });
    }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private/Teacher
const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const exam = await prisma.exam.findUnique({
            where: { id },
            select: { teacherId: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this exam' });
        }

        await prisma.exam.delete({ where: { id } });

        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Error deleting exam' });
    }
};

module.exports = { createExam, getExams, getExam, updateExam, deleteExam };
