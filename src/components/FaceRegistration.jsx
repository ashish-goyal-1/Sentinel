import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const FaceRegistration = ({ isOpen, onClose, onSuccess }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // States: loading, ready, capturing, review, saving, success, error
    const [status, setStatus] = useState('loading');
    const [cameraActive, setCameraActive] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Review Step State
    const [tempDescriptor, setTempDescriptor] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    // Load face-api models
    useEffect(() => {
        if (!isOpen) return;

        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                console.log('Face recognition models loaded');
            } catch (error) {
                console.error('Error loading face models:', error);
                setStatus('error');
            }
        };
        loadModels();
    }, [isOpen]);

    // Start camera
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'user' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraActive(true);
                    setStatus('ready');
                }
            } catch (error) {
                console.error('Camera error:', error);
                toast.error('Camera access is required for face registration');
                setStatus('error');
            }
        };

        startCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, modelsLoaded]);

    // Capture face (now just stores to state, doesn't send yet)
    const captureFace = async () => {
        if (!videoRef.current || !cameraActive) return;

        setStatus('capturing');
        setCountdown(3);

        // Countdown before capture
        for (let i = 3; i > 0; i--) {
            setCountdown(i);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(null);

        try {
            // Detect face with descriptor
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error('No face detected. Please position your face clearly.');
                setStatus('ready');
                return;
            }

            // ==========================================
            // CAPTURE FRAME FOR REVIEW
            // ==========================================
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

            // ==========================================
            // STORE DESCRIPTOR (DON'T SEND YET)
            // ==========================================
            setTempDescriptor(Array.from(detection.descriptor));
            setStatus('review');

            toast.success('Face captured! Review your photo below.');
        } catch (error) {
            console.error('Face capture error:', error);
            toast.error('Failed to capture face. Please try again.');
            setStatus('ready');
        }
    };

    // Retake - go back to camera view
    const handleRetake = () => {
        setTempDescriptor(null);
        setCapturedImage(null);
        setStatus('ready');
    };

    // Confirm and save - NOW send to backend
    const handleConfirmSave = async () => {
        if (!tempDescriptor) return;

        setStatus('saving');

        try {
            const response = await api.post('/users/face-descriptor', {
                descriptor: tempDescriptor
            });

            if (response.data.message) {
                toast.success('Face registered successfully! 🎉');
                setStatus('success');

                // Stop camera
                if (videoRef.current?.srcObject) {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                }

                // Notify parent after short delay
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            console.error('Face save error:', error);
            toast.error(error.response?.data?.error || 'Failed to save face');
            setStatus('review'); // Stay in review so they can retry
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
