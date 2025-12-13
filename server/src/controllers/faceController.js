const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Register user's face descriptor
// @route   POST /api/users/face-descriptor
// @access  Private (Students only)
const registerFaceDescriptor = async (req, res) => {
    try {
        const { descriptor } = req.body;

        // Validate descriptor
        if (!descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        // Validate descriptor length (should be 128 floats from face-api.js)
        if (descriptor.length !== 128) {
            return res.status(400).json({
                error: `Invalid descriptor length. Expected 128, got ${descriptor.length}`
            });
        }

        // Validate all values are numbers
        if (!descriptor.every(val => typeof val === 'number' && !isNaN(val))) {
            return res.status(400).json({ error: 'Descriptor must contain only valid numbers' });
        }

        // Update user with face descriptor
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                faceDescriptor: descriptor,
                faceRegisteredAt: new Date()
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                faceRegisteredAt: true
            }
        });

        console.log(`✅ Face registered for user: ${updatedUser.name} (${updatedUser.email})`);

        res.json({
            message: 'Face registered successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Face registration error:', error);
        res.status(500).json({ error: 'Failed to register face' });
    }
};

// @desc    Check if user has registered face
// @route   GET /api/users/face-status
// @access  Private
const getFaceStatus = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                faceDescriptor: true,
                faceRegisteredAt: true
            }
        });

        const hasFaceRegistered = user?.faceDescriptor && user.faceDescriptor.length === 128;

        res.json({
            hasFaceRegistered,
            faceRegisteredAt: user?.faceRegisteredAt || null
        });
    } catch (error) {
        console.error('Face status error:', error);
        res.status(500).json({ error: 'Failed to get face status' });
    }
};

// @desc    Get stored face descriptor for verification
// @route   GET /api/users/face-descriptor
// @access  Private (for exam verification)
const getFaceDescriptor = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                faceDescriptor: true
            }
        });

        if (!user?.faceDescriptor || user.faceDescriptor.length !== 128) {
            return res.status(404).json({
                error: 'Face not registered',
                hasFaceRegistered: false
            });
        }

        res.json({
            descriptor: user.faceDescriptor,
            hasFaceRegistered: true
        });
    } catch (error) {
        console.error('Get face descriptor error:', error);
        res.status(500).json({ error: 'Failed to get face descriptor' });
    }
};

// @desc    Delete face descriptor (for re-registration)
// @route   DELETE /api/users/face-descriptor
// @access  Private
const deleteFaceDescriptor = async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                faceDescriptor: [],
                faceRegisteredAt: null
            }
        });

        res.json({ message: 'Face descriptor deleted successfully' });
    } catch (error) {
        console.error('Delete face descriptor error:', error);
        res.status(500).json({ error: 'Failed to delete face descriptor' });
    }
};

module.exports = {
    registerFaceDescriptor,
    getFaceStatus,
    getFaceDescriptor,
    deleteFaceDescriptor
};
