const express = require('express');
const router = express.Router();
const {
    submitExam,
    getMySubmissions,
    getSubmission
} = require('../controllers/submissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Student submission endpoints
router.get('/', authorize('STUDENT'), getMySubmissions);
router.get('/:id', getSubmission);

// Submit exam (uses examId from body, but route is cleaner here)
router.post('/exam/:examId', authorize('STUDENT'), submitExam);

module.exports = router;
