const express = require('express');
const router = express.Router();
const {
    registerFaceDescriptor,
    getFaceStatus,
    getFaceDescriptor,
    deleteFaceDescriptor
} = require('../controllers/faceController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication

// POST /api/users/face-descriptor - Register face
router.post('/face-descriptor', protect, registerFaceDescriptor);

// GET /api/users/face-status - Check if face is registered
router.get('/face-status', protect, getFaceStatus);

// GET /api/users/face-descriptor - Get stored descriptor for verification
router.get('/face-descriptor', protect, getFaceDescriptor);

// DELETE /api/users/face-descriptor - Remove face descriptor
router.delete('/face-descriptor', protect, deleteFaceDescriptor);

module.exports = router;
