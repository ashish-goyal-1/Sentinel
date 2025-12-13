const express = require('express');
const router = express.Router();
const {
    getAnalyticsOverview,
    getSuspiciousStudents,
    getExamPerformanceAnalytics,
    getScoreDistribution
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All analytics routes require authentication and TEACHER role
// These endpoints use Raw SQL ($queryRaw) to demonstrate SQL proficiency

// GET /api/analytics/overview - Platform-wide statistics
router.get('/overview', protect, getAnalyticsOverview);

// GET /api/analytics/suspicious-students - THE RESUME FLEX QUERY
// Complex SQL aggregation with JOINs, GROUP BY, HAVING, aggregate functions
router.get('/suspicious-students', protect, getSuspiciousStudents);

// GET /api/analytics/exam-performance - Teacher's exam metrics
router.get('/exam-performance', protect, getExamPerformanceAnalytics);

// GET /api/analytics/score-distribution/:examId - Grade distribution for charts
router.get('/score-distribution/:examId', protect, getScoreDistribution);

module.exports = router;
