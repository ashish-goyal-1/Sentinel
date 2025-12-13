const express = require('express');
const router = express.Router();
const { updateQuestion, deleteQuestion } = require('../controllers/questionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected and teacher-only
router.use(protect, authorize('TEACHER'));

router.route('/:id')
    .put(updateQuestion)
    .delete(deleteQuestion);

module.exports = router;
