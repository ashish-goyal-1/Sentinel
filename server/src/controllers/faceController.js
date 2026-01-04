const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// @desc    Register user's face descriptor
// @route   POST /api/users/face-descriptor
// @access  Private (Students only)
const registerFaceDescriptor = async (req, res) => {
    logger.divider('FACE REGISTRATION');
    logger.info('Face descriptor registration requested');
    logger.pushContext('Face Registration');

    try {
        const { descriptor } = req.body;
        logger.debug('Request received', {
            userId: req.user.id,
            userName: req.user.name,
            descriptorProvided: !!descriptor,
            descriptorLength: descriptor?.length
        });

        // Validate descriptor
        if (!descriptor || !Array.isArray(descriptor)) {
            logger.warn('Invalid request - descriptor missing or not an array');
            logger.popContext();
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        logger.info('Validating face descriptor...');

        // Validate descriptor length (should be 128 floats from face-api.js)
        if (descriptor.length !== 128) {
            logger.error(`Invalid descriptor length: expected 128, got ${descriptor.length}`);
            logger.popContext();
            return res.status(400).json({
                error: `Invalid descriptor length. Expected 128, got ${descriptor.length}`
            });
        }
        logger.success('Descriptor length validated (128 values)');

        // Validate all values are numbers
        logger.info('Validating descriptor values...');
        const invalidValues = descriptor.filter(val => typeof val !== 'number' || isNaN(val));
        if (invalidValues.length > 0) {
            logger.error('Descriptor contains invalid values', {
                invalidCount: invalidValues.length,
                sample: invalidValues.slice(0, 5)
            });
            logger.popContext();
            return res.status(400).json({ error: 'Descriptor must contain only valid numbers' });
        }
        logger.success('All descriptor values validated');

        // Update user with face descriptor
        logger.info('Saving face descriptor to database...');
        const startTime = Date.now();

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

        const duration = Date.now() - startTime;
        logger.success(`Face descriptor saved to database (${duration}ms)`);
        logger.success(`Face registered for user: ${updatedUser.name} (${updatedUser.email})`);
        logger.debug('Registration details', {
            userId: updatedUser.id,
            registeredAt: updatedUser.faceRegisteredAt,
            role: updatedUser.role
        });

        logger.popContext();
        logger.divider();

        res.json({
            message: 'Face registered successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error('Face registration failed', error);
        logger.popContext();
        res.status(500).json({ error: 'Failed to register face' });
    }
};

// @desc    Check if user has registered face
// @route   GET /api/users/face-status
// @access  Private
const getFaceStatus = async (req, res) => {
    logger.info('Face status check requested');
    logger.pushContext('Face Status Check');

    try {
        logger.debug('Fetching user face status', {
            userId: req.user.id,
            userName: req.user.name
        });

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                faceDescriptor: true,
                faceRegisteredAt: true
            }
        });

        const hasFaceRegistered = user?.faceDescriptor && user.faceDescriptor.length === 128;

        if (hasFaceRegistered) {
            logger.success('Face is registered', {
                registeredAt: user.faceRegisteredAt,
                descriptorLength: user.faceDescriptor.length
            });
        } else {
            logger.warn('Face not registered or invalid descriptor', {
                hasDescriptor: !!user?.faceDescriptor,
                descriptorLength: user?.faceDescriptor?.length || 0
            });
        }

        logger.popContext();

        res.json({
            hasFaceRegistered,
            faceRegisteredAt: user?.faceRegisteredAt || null
        });
    } catch (error) {
        logger.error('Face status check failed', error);
        logger.popContext();
        res.status(500).json({ error: 'Failed to get face status' });
    }
};

// @desc    Get stored face descriptor for verification
// @route   GET /api/users/face-descriptor
// @access  Private (for exam verification)
const getFaceDescriptor = async (req, res) => {
    logger.info('Face descriptor retrieval requested');
    logger.pushContext('Get Face Descriptor');

    try {
        logger.debug('Fetching face descriptor from database', {
            userId: req.user.id,
            userName: req.user.name
        });

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                faceDescriptor: true
            }
        });

        if (!user?.faceDescriptor || user.faceDescriptor.length !== 128) {
            logger.warn('Face descriptor not found or invalid', {
                hasDescriptor: !!user?.faceDescriptor,
                descriptorLength: user?.faceDescriptor?.length || 0
            });
            logger.popContext();
            return res.status(404).json({
                error: 'Face not registered',
                hasFaceRegistered: false
            });
        }

        logger.success('Face descriptor retrieved successfully', {
            descriptorLength: user.faceDescriptor.length
        });
        logger.debug('Descriptor sample (first 5 values)', {
            sample: user.faceDescriptor.slice(0, 5)
        });

        logger.popContext();

        res.json({
            descriptor: user.faceDescriptor,
            hasFaceRegistered: true
        });
    } catch (error) {
        logger.error('Failed to retrieve face descriptor', error);
        logger.popContext();
        res.status(500).json({ error: 'Failed to get face descriptor' });
    }
};

// @desc    Delete face descriptor (for re-registration)
// @route   DELETE /api/users/face-descriptor
// @access  Private
const deleteFaceDescriptor = async (req, res) => {
    logger.info('Face descriptor deletion requested');
    logger.pushContext('Delete Face Descriptor');

    try {
        logger.debug('Deleting face descriptor', {
            userId: req.user.id,
            userName: req.user.name
        });

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                faceDescriptor: [],
                faceRegisteredAt: null
            }
        });

        logger.success('Face descriptor deleted successfully');
        logger.info('User can now re-register their face');
        logger.popContext();

        res.json({ message: 'Face descriptor deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete face descriptor', error);
        logger.popContext();
        res.status(500).json({ error: 'Failed to delete face descriptor' });
    }
};

module.exports = {
    registerFaceDescriptor,
    getFaceStatus,
    getFaceDescriptor,
    deleteFaceDescriptor
};

