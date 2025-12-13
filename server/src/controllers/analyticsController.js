const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get analytics using Raw SQL (Resume Flex - demonstrates SQL proficiency)
// @route   GET /api/analytics/overview
// @access  Private (Teachers only)
// 
// INTENTIONALLY using prisma.$queryRaw to demonstrate SQL aggregation skills
// This query performs JOINs, GROUP BY, aggregate functions, and subqueries
// in a single efficient database round-trip
const getAnalyticsOverview = async (req, res) => {
    try {
        // Only teachers can access analytics
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        // Raw SQL for platform-wide statistics
        const platformStats = await prisma.$queryRaw`
            SELECT 
                (SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT') as total_students,
                (SELECT COUNT(*) FROM "User" WHERE role = 'TEACHER') as total_teachers,
                (SELECT COUNT(*) FROM "Exam") as total_exams,
                (SELECT COUNT(*) FROM "Submission") as total_submissions,
                (SELECT COALESCE(AVG(score::float / "totalQuestions" * 100), 0) FROM "Submission") as avg_score_percentage
        `;

        res.json({
            overview: platformStats[0],
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Error fetching analytics' });
    }
};

// @desc    Get suspicious students using complex Raw SQL aggregation
// @route   GET /api/analytics/suspicious-students
// @access  Private (Teachers only)
//
// This is the "Resume Flex" query - demonstrates:
// - JOINs between User and Submission tables
// - GROUP BY with aggregate functions (COUNT, AVG, SUM)
// - HAVING clause for filtering aggregated results
// - ORDER BY for sorting
// - Type casting and NULL handling with COALESCE
const getSuspiciousStudents = async (req, res) => {
    try {
        // Only teachers can access this
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        // Complex SQL aggregation query - THE RESUME FLEX
        // Finds students with suspicious behavior patterns
        const suspiciousStudents = await prisma.$queryRaw`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(s.id)::int as exams_taken,
                COALESCE(AVG(s.score::float / NULLIF(s."totalQuestions", 0) * 100), 0)::float as avg_score_percent,
                COALESCE(SUM(s."warningsCount"), 0)::int as total_warnings,
                COALESCE(AVG(s."warningsCount"), 0)::float as avg_warnings_per_exam,
                CASE 
                    WHEN SUM(s."warningsCount") > 10 THEN 'HIGH'
                    WHEN SUM(s."warningsCount") > 5 THEN 'MEDIUM'
                    ELSE 'LOW'
                END as risk_level
            FROM "User" u
            LEFT JOIN "Submission" s ON u.id = s."studentId"
            WHERE u.role = 'STUDENT'
            GROUP BY u.id, u.name, u.email
            HAVING SUM(s."warningsCount") > 0
            ORDER BY SUM(s."warningsCount") DESC
            LIMIT 20
        `;

        res.json({
            suspiciousStudents,
            query_info: {
                description: 'Students with warning counts, ordered by total warnings',
                sql_features_used: ['JOIN', 'GROUP BY', 'HAVING', 'AGGREGATE FUNCTIONS', 'CASE WHEN', 'COALESCE']
            }
        });
    } catch (error) {
        console.error('Suspicious students error:', error);
        res.status(500).json({ error: 'Error fetching suspicious students' });
    }
};

// @desc    Get exam performance analytics using Raw SQL
// @route   GET /api/analytics/exam-performance
// @access  Private (Teachers only)
const getExamPerformanceAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        // Get this teacher's exams with performance metrics
        const examPerformance = await prisma.$queryRaw`
            SELECT 
                e.id,
                e.title,
                e.duration,
                e."isActive",
                COUNT(s.id)::int as submission_count,
                COALESCE(AVG(s.score::float / NULLIF(s."totalQuestions", 0) * 100), 0)::float as avg_score_percent,
                COALESCE(MIN(s.score::float / NULLIF(s."totalQuestions", 0) * 100), 0)::float as min_score_percent,
                COALESCE(MAX(s.score::float / NULLIF(s."totalQuestions", 0) * 100), 0)::float as max_score_percent,
                COALESCE(SUM(s."warningsCount"), 0)::int as total_warnings,
                COUNT(CASE WHEN s."warningsCount" > 3 THEN 1 END)::int as flagged_submissions
            FROM "Exam" e
            LEFT JOIN "Submission" s ON e.id = s."examId"
            WHERE e."teacherId" = ${req.user.id}
            GROUP BY e.id, e.title, e.duration, e."isActive"
            ORDER BY e."createdAt" DESC
        `;

        res.json({
            examPerformance,
            teacherId: req.user.id
        });
    } catch (error) {
        console.error('Exam performance error:', error);
        res.status(500).json({ error: 'Error fetching exam performance' });
    }
};

// @desc    Get score distribution for charts
// @route   GET /api/analytics/score-distribution/:examId
// @access  Private (Teachers only)
const getScoreDistribution = async (req, res) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Access denied. Teachers only.' });
        }

        const { examId } = req.params;

        // Verify teacher owns this exam
        const exam = await prisma.exam.findFirst({
            where: { id: examId, teacherId: req.user.id }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Get score distribution using Raw SQL
        const distribution = await prisma.$queryRaw`
            SELECT 
                CASE 
                    WHEN (score::float / NULLIF("totalQuestions", 0) * 100) >= 90 THEN 'A (90-100%)'
                    WHEN (score::float / NULLIF("totalQuestions", 0) * 100) >= 80 THEN 'B (80-89%)'
                    WHEN (score::float / NULLIF("totalQuestions", 0) * 100) >= 70 THEN 'C (70-79%)'
                    WHEN (score::float / NULLIF("totalQuestions", 0) * 100) >= 60 THEN 'D (60-69%)'
                    ELSE 'F (Below 60%)'
                END as grade,
                COUNT(*)::int as count
            FROM "Submission"
            WHERE "examId" = ${examId}
            GROUP BY grade
            ORDER BY grade
        `;

        res.json({
            examId,
            examTitle: exam.title,
            distribution
        });
    } catch (error) {
        console.error('Score distribution error:', error);
        res.status(500).json({ error: 'Error fetching score distribution' });
    }
};

module.exports = {
    getAnalyticsOverview,
    getSuspiciousStudents,
    getExamPerformanceAnalytics,
    getScoreDistribution
};
