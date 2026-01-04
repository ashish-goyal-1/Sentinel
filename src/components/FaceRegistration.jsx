import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import logger from '../utils/logger';

const FaceRegistration = ({ isOpen, onClose, onSuccess }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // States: loading, ready, capuring, review, saving, success, error
    const [status, setStatus] = useState('loading');
    const [cameraActive, setCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Review Step State
    const [tempDescriptor, setTempDescriptor] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    // Load face-api models (in background - don't block camera)
    useEffect(() => {
        if (!isOpen) return;

        const loadModels = async (retryCount = 0) => {
            logger.divider('FACE REGISTRATION - MODEL LOADING');
            logger.info(`Loading face recognition models for registration (attempt ${retryCount + 1}/3)`);

            try {
                const MODEL_URL = '/models';
                logger.debug('Model URL', { MODEL_URL });

                logger.info('Loading TinyFaceDetector model...');
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                logger.success('TinyFaceDetector loaded');

                logger.info('Loading FaceLandmark68 model...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                logger.success('FaceLandmark68 loaded');

                logger.info('Loading FaceRecognition model...');
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                logger.success('FaceRecognition loaded');

                setModelsLoaded(true);
                logger.success('All face recognition models loaded successfully');
                logger.divider();
            } catch (error) {
                logger.error(`Error loading face models (attempt ${retryCount + 1}/3)`, error);

                if (retryCount < 2) {
                    logger.warn(`Retrying model load in 1 second... (fallback retry mechanism)`);
                    setTimeout(() => loadModels(retryCount + 1), 1000);
                } else {
                    logger.error('Failed to load AI models after 3 attempts - using fallback mode');
                    toast.error('Failed to load AI models');
                    logger.warn('Camera will still work - error will show at capture time (fallback behavior)');
                }
            }
        };
        loadModels();
    }, [isOpen]);

    // Start camera IMMEDIATELY when modal opens (don't wait for models)
    useEffect(() => {
        if (!isOpen) return;

        const startCamera = async () => {
            logger.info('Starting camera for face registration');
            logger.pushContext('Camera Initialization');

            try {
                logger.info('Requesting camera permissions...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'user' }
                });
                logger.success('Camera permission granted');

                if (videoRef.current) {
                    logger.debug('Attaching stream to video element');
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(e => {
                        logger.warn('Video play warning (non-critical)', e);
                    });
                    setCameraActive(true);
                    setStatus('ready');
                    logger.success('Camera active and ready for face capture');
                }

                logger.popContext();
            } catch (error) {
                logger.error('Camera initialization failed', error);
                toast.error('Camera access is required for face registration');
                setStatus('error');
                logger.popContext();
            }
        };

        startCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                logger.info('Stopping camera stream (cleanup)');
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                logger.debug('Camera stream stopped');
            }
        };
    }, [isOpen]);

    // Capture face (now just stores to state, doesn't send yet)
    const captureFace = async () => {
        logger.divider('FACE CAPTURE');
        logger.info('Face capture initiated');
        logger.pushContext('Face Capture');

        if (!videoRef.current || !cameraActive) {
            logger.warn('Capture aborted - camera not ready', {
                hasVideo: !!videoRef.current,
                cameraActive
            });
            logger.popContext();
            return;
        }

        // Check if models are loaded before capturing
        if (!modelsLoaded) {
            logger.warn('Capture aborted - AI models still loading (fallback: wait for models)');
            toast.error('AI models are still loading. Please wait a moment.');
            logger.popContext();
            return;
        }

        setStatus('capturing');
        setCountdown(3);
        logger.info('Starting countdown (3 seconds)...');

        // Countdown before capture
        for (let i = 3; i > 0; i--) {
            logger.debug(`Countdown: ${i}`);
            setCountdown(i);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(null);
        logger.info('Countdown complete - capturing face...');

        try {
            // Detect face with descriptor
            logger.info('Detecting face in video stream...');
            const startTime = performance.now();

            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            const detectionTime = performance.now() - startTime;
            logger.debug(`Face detection completed (${detectionTime.toFixed(2)}ms)`);

            if (!detection) {
                logger.warn('No face detected in frame');
                toast.error('No face detected. Please position your face clearly.');
                setStatus('ready');
                logger.popContext();
                return;
            }

            logger.success('Face detected successfully');
            logger.debug('Detection details', {
                hasLandmarks: !!detection.landmarks,
                hasDescriptor: !!detection.descriptor,
                descriptorLength: detection.descriptor.length,
                detectionScore: detection.detection.score.toFixed(4)
            });

            // ==========================================
            // CAPTURE FRAME FOR REVIEW
            // ==========================================
            logger.info('Capturing frame for review...');
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            // Draw video frame (mirrored)
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);

            // Convert to image URL
            const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageUrl);
            logger.success('Frame captured for review', {
                imageSize: `${canvas.width}x${canvas.height}`,
                imageDataLength: imageUrl.length
            });

            // ==========================================
            // STORE DESCRIPTOR (DON'T SEND YET)
            // ==========================================
            logger.info('Storing face descriptor for review...');
            const descriptorArray = Array.from(detection.descriptor);
            setTempDescriptor(descriptorArray);
            setStatus('review');

            logger.success('Face descriptor stored (not saved yet)', {
                descriptorLength: descriptorArray.length,
                sample: descriptorArray.slice(0, 5)
            });
            logger.info('Waiting for user confirmation before saving...');
            logger.popContext();
            logger.divider();

            toast.success('Face captured! Review your photo below.');
        } catch (error) {
            logger.error('Face capture failed', error);
            toast.error('Failed to capture face. Please try again.');
            setStatus('ready');
            logger.popContext();
        }
    };

    // Retake - go back to camera view
    const handleRetake = () => {
        logger.info('User requested retake - clearing captured data');
        setTempDescriptor(null);
        setCapturedImage(null);
        setStatus('ready');
        logger.debug('Ready for new capture');
    };

    // Confirm and save - NOW send to backend
    const handleConfirmSave = async () => {
        if (!tempDescriptor) {
            logger.warn('Save aborted - no descriptor available');
            return;
        }

        logger.divider('SAVING FACE DESCRIPTOR');
        logger.info('User confirmed - saving face descriptor to server');
        logger.pushContext('Save Face Descriptor');

        setStatus('saving');
        logger.debug('Descriptor details', {
            length: tempDescriptor.length,
            sample: tempDescriptor.slice(0, 5)
        });

        try {
            logger.info('Sending face descriptor to backend...');
            const startTime = performance.now();

            const response = await api.post('/users/face-descriptor', {
                descriptor: tempDescriptor
            });

            const saveTime = performance.now() - startTime;
            logger.success(`Face descriptor saved successfully (${saveTime.toFixed(2)}ms)`);
            logger.debug('Server response', response.data);

            if (response.data.message) {
                toast.success('Face registered successfully! 🎉');
                setStatus('success');
                logger.success('Face registration complete!');

                // Stop camera
                if (videoRef.current?.srcObject) {
                    logger.info('Stopping camera stream...');
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                    logger.debug('Camera stopped');
                }

                logger.info('Closing registration modal in 1.5 seconds...');
                logger.popContext();
                logger.divider();

                // Notify parent after short delay
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            logger.error('Failed to save face descriptor', error);
            logger.warn('Staying in review mode for retry (fallback behavior)');
            toast.error(error.response?.data?.error || 'Failed to save face');
            setStatus('review'); // Stay in review so they can retry
            logger.popContext();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Hidden canvas for capturing frame */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Modal */}
            <div className="relative glass-card p-8 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">{status === 'review' ? '👀' : '🧑'}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        {status === 'review' ? 'Review Your Photo' : 'Face Verification Required'}
                    </h2>
                    <p className="text-zinc-400">
                        {status === 'review'
                            ? 'Make sure your face is clearly visible and well-lit'
                            : 'Register your face to enable secure exam proctoring'
                        }
                    </p>
                </div>

                {/* Camera/Preview Area */}
                <div className="relative mb-6 rounded-xl overflow-hidden bg-zinc-900 aspect-video">
                    {/* Live Video (hidden during review) */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover scale-x-[-1] ${status === 'review' || status === 'saving' || status === 'success' ? 'hidden' : ''}`}
                    />

                    {/* Captured Image Preview (shown during review) */}
                    {(status === 'review' || status === 'saving') && capturedImage && (
                        <img
                            src={capturedImage}
                            alt="Captured face"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Overlay States */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="text-zinc-400">Loading camera...</p>
                            </div>
                        </div>
                    )}

                    {countdown && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-7xl font-bold text-white animate-pulse">{countdown}</div>
                        </div>
                    )}

                    {status === 'saving' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="text-white font-medium">Saving...</p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-600/20">
                            <div className="text-center">
                                <div className="text-6xl mb-2">✅</div>
                                <p className="text-lg font-medium text-green-400">Face Registered!</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-600/20">
                            <div className="text-center">
                                <div className="text-6xl mb-2">❌</div>
                                <p className="text-lg font-medium text-red-400">Camera Error</p>
                                <p className="text-sm text-zinc-400 mt-2">Please allow camera access</p>
                            </div>
                        </div>
                    )}

                    {/* Face guide overlay (only in ready state) */}
                    {status === 'ready' && (
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-indigo-400/50 rounded-full" />
                        </div>
                    )}

                    {/* Review badge */}
                    {status === 'review' && (
                        <div className="absolute top-4 right-4 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-sm font-medium">
                            📸 Preview
                        </div>
                    )}
                </div>

                {/* Instructions (only show in ready state) */}
                {status === 'ready' && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">📋 Instructions:</h4>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• Position your face within the oval guide</li>
                            <li>• Ensure good lighting on your face</li>
                            <li>• Remove glasses if possible</li>
                            <li>• Look directly at the camera</li>
                        </ul>
                    </div>
                )}

                {/* Review Tips (only show in review state) */}
                {status === 'review' && (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-yellow-400 mb-2">✅ Check your photo:</h4>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• Is your face clearly visible?</li>
                            <li>• Are your eyes open?</li>
                            <li>• Is the lighting good?</li>
                        </ul>
                    </div>
                )}

                {/* Buttons - Different for each state */}
                <div className="flex gap-4">
                    {status === 'ready' && (
                        <>
                            <button
                                onClick={onClose}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={captureFace}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                📸 Capture Face
                            </button>
                        </>
                    )}

                    {status === 'capturing' && (
                        <button
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                            disabled
                        >
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Capturing...
                        </button>
                    )}

                    {status === 'review' && (
                        <>
                            <button
                                onClick={handleRetake}
                                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                            >
                                🔄 Retake
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                ✅ Confirm & Save
                            </button>
                        </>
                    )}

                    {status === 'saving' && (
                        <button
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                            disabled
                        >
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </button>
                    )}
                </div>

                {/* Privacy note */}
                <p className="text-xs text-zinc-500 text-center mt-4">
                    🔒 We only store a mathematical representation of your face, not the actual image.
                </p>
            </div>
        </div>
    );
};

export default FaceRegistration;
