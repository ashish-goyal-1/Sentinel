const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Add question to exam
// @route   POST /api/exams/:examId/questions
// @access  Private/Teacher
const addQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const { text, options, correctOption } = req.body;

        // Validation
        if (!text || !options || correctOption === undefined) {
            return res.status(400).json({ error: 'Text, options, and correctOption are required' });
        }

        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: 'Options must be an array with at least 2 choices' });
        }

        // Check exam ownership
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: { teacherId: true }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        if (exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to add questions to this exam' });
        }

        const question = await prisma.question.create({
            data: {
                text,
                options,
                correctOption: parseInt(correctOption),
                examId
            }
        });

        res.status(201).json(question);
    } catch (error) {
        console.error('Add question error:', error);
        res.status(500).json({ error: 'Error adding question' });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private/Teacher
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption } = req.body;

        // Get question with exam to check ownership
        const question = await prisma.question.findUnique({
            where: { id },
            include: { exam: { select: { teacherId: true } } }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (question.exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this question' });
        }

        const updatedQuestion = await prisma.question.update({
            where: { id },
            data: {
                text,
                options,
                correctOption: correctOption !== undefined ? parseInt(correctOption) : undefined
            }
        });

        res.json(updatedQuestion);
    } catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Error updating question' });
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private/Teacher
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Get question with exam to check ownership
        const question = await prisma.question.findUnique({
            where: { id },
            include: { exam: { select: { teacherId: true } } }
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (question.exam.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this question' });
        }

        await prisma.question.delete({ where: { id } });

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Error deleting question' });
    }
};

module.exports = { addQuestion, updateQuestion, deleteQuestion };
