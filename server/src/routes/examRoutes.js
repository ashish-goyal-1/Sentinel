const express = require('express');
const router = express.Router();
const {
    createExam,
    getExams,
    getExam,
    updateExam,
    deleteExam
} = require('../controllers/examController');
const { addQuestion } = require('../controllers/questionController');
const { getExamSubmissions } = require('../controllers/submissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Exam CRUD
router.route('/')
    .get(getExams)
    .post(authorize('TEACHER'), createExam);

router.route('/:id')
    .get(getExam)
    .put(authorize('TEACHER'), updateExam)
    .delete(authorize('TEACHER'), deleteExam);

// Add question to exam
router.post('/:examId/questions', authorize('TEACHER'), addQuestion);

// Get exam submissions (Teacher only)
router.get('/:examId/submissions', authorize('TEACHER'), getExamSubmissions);

module.exports = router;
