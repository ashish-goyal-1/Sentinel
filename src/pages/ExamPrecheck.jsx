import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as faceapi from 'face-api.js';
import api from '../services/api';
import FaceRegistration from '../components/FaceRegistration';

const ExamPrecheck = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);

    // Exam data
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check states
    const [checks, setChecks] = useState({
        camera: { status: 'pending', message: 'Waiting...' },
        faceRegistered: { status: 'pending', message: 'Waiting...' },
        faceMatch: { status: 'pending', message: 'Waiting...' },
        singleFace: { status: 'pending', message: 'Waiting...' },
    });

    // Face registration
    const [showFaceRegistration, setShowFaceRegistration] = useState(false);
    const [storedDescriptor, setStoredDescriptor] = useState(null);

    // Models & Camera
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);

    // All checks passed
    const allChecksPassed = Object.values(checks).every(check => check.status === 'passed');

    // Fetch exam details
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const response = await api.get(`/exams/${id}`);
                setExam(response.data);
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to load exam');
                navigate('/student');
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id, navigate]);

    // Load face-api models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error('Error loading face models:', error);
                toast.error('Failed to load face detection models');
            }
        };
        loadModels();
    }, []);

    // Step 1: Check camera access
    const checkCamera = useCallback(async () => {
        setChecks(prev => ({
            ...prev,
            camera: { status: 'checking', message: 'Requesting camera access...' }
        }));

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraStream(stream);
            setChecks(prev => ({
                ...prev,
                camera: { status: 'passed', message: 'Camera working' }
            }));

            return true;
        } catch (error) {
            console.error('Camera error:', error);
            setChecks(prev => ({
                ...prev,
                camera: { status: 'failed', message: 'Camera access denied' }
            }));
            return false;
        }
    }, []);

    // Step 2: Check if face is registered
    const checkFaceRegistered = useCallback(async () => {
        setChecks(prev => ({
            ...prev,
            faceRegistered: { status: 'checking', message: 'Checking registration...' }
        }));

        try {
            const response = await api.get('/users/face-status');

            if (response.data.hasFaceRegistered) {
                // Fetch stored descriptor
                const descriptorRes = await api.get('/users/face-descriptor');
                setStoredDescriptor(new Float32Array(descriptorRes.data.descriptor));

                setChecks(prev => ({
                    ...prev,
                    faceRegistered: { status: 'passed', message: 'Face registered' }
                }));
                return true;
            } else {
                setChecks(prev => ({
                    ...prev,
                    faceRegistered: { status: 'action', message: 'Registration required' }
                }));
                return false;
            }
        } catch (error) {
            console.error('Face status check error:', error);
            setChecks(prev => ({
                ...prev,
                faceRegistered: { status: 'failed', message: 'Check failed' }
            }));
            return false;
        }
    }, []);

    // Step 3: Verify face matches
    const checkFaceMatch = useCallback(async () => {
        if (!storedDescriptor || !videoRef.current || !modelsLoaded) return false;

        setChecks(prev => ({
            ...prev,
            faceMatch: { status: 'checking', message: 'Verifying identity...' }
        }));

        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setChecks(prev => ({
                    ...prev,
                    faceMatch: { status: 'failed', message: 'No face detected' }
                }));
                return false;
            }

            const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

            if (distance < 0.6) {
                setChecks(prev => ({
                    ...prev,
                    faceMatch: { status: 'passed', message: 'Identity verified' }
                }));
                return true;
            } else {
                setChecks(prev => ({
                    ...prev,
                    faceMatch: { status: 'failed', message: 'Face mismatch' }
                }));
                return false;
            }
        } catch (error) {
            console.error('Face match error:', error);
            setChecks(prev => ({
                ...prev,
                faceMatch: { status: 'failed', message: 'Verification failed' }
            }));
            return false;
        }
    }, [storedDescriptor, modelsLoaded]);

    // Step 4: Check for single face
    const checkSingleFace = useCallback(async () => {
        if (!videoRef.current || !modelsLoaded) return false;

        setChecks(prev => ({
            ...prev,
            singleFace: { status: 'checking', message: 'Scanning environment...' }
        }));

        try {
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            );

            if (detections.length === 1) {
                setChecks(prev => ({
                    ...prev,
                    singleFace: { status: 'passed', message: 'Single face confirmed' }
                }));
                return true;
            } else if (detections.length === 0) {
                setChecks(prev => ({
                    ...prev,
                    singleFace: { status: 'failed', message: 'No face detected' }
                }));
                return false;
            } else {
                setChecks(prev => ({
                    ...prev,
                    singleFace: { status: 'failed', message: `${detections.length} faces detected` }
                }));
                return false;
            }
        } catch (error) {
            console.error('Single face check error:', error);
            setChecks(prev => ({
                ...prev,
                singleFace: { status: 'failed', message: 'Check failed' }
            }));
            return false;
        }
    }, [modelsLoaded]);

    // Run all checks in sequence
    const runChecks = useCallback(async () => {
        // Check camera first
        const cameraOk = await checkCamera();
        if (!cameraOk) return;

        // Wait for models to load
        if (!modelsLoaded) {
            toast.loading('Loading AI models...', { id: 'models-loading' });
            return;
        }
        toast.dismiss('models-loading');

        // Check face registration
        const faceRegisteredOk = await checkFaceRegistered();

        if (!faceRegisteredOk) {
            // Need to register face - stop camera first
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
            }
            setShowFaceRegistration(true);
            return;
        }

        // Face match check
        const faceMatchOk = await checkFaceMatch();
        if (!faceMatchOk) return;

        // Single face check
        await checkSingleFace();

    }, [checkCamera, checkFaceRegistered, checkFaceMatch, checkSingleFace, modelsLoaded, cameraStream]);

    // Start checks when models are loaded
    useEffect(() => {
        if (!loading && exam && modelsLoaded) {
            runChecks();
        }
    }, [loading, exam, modelsLoaded, runChecks]);

    // Handle face registration success
    const handleFaceRegistrationSuccess = async () => {
        setShowFaceRegistration(false);

        // Re-run checks from the beginning
        setChecks({
            camera: { status: 'pending', message: 'Waiting...' },
            faceRegistered: { status: 'pending', message: 'Waiting...' },
            faceMatch: { status: 'pending', message: 'Waiting...' },
            singleFace: { status: 'pending', message: 'Waiting...' },
        });

        // Small delay before restarting checks
        setTimeout(() => {
            runChecks();
        }, 500);
    };

    // Retry a specific check
    const retryCheck = async (checkName) => {
        switch (checkName) {
            case 'camera':
                await checkCamera();
                break;
            case 'faceMatch':
                await checkFaceMatch();
                break;
            case 'singleFace':
                await checkSingleFace();
                break;
            default:
                break;
        }
    };

    // Begin exam
    const beginExam = () => {
        // Stop camera stream (exam page will start its own)
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }

        // Navigate to actual exam
        navigate(`/student/exam/${id}/take`, {
            state: {
                verified: true,
                storedDescriptor: Array.from(storedDescriptor)
            }
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'passed': return '✅';
            case 'failed': return '❌';
            case 'checking': return '⏳';
            case 'action': return '⚠️';
            default: return '⏸️';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'passed': return 'text-green-400';
            case 'failed': return 'text-red-400';
            case 'checking': return 'text-yellow-400';
            case 'action': return 'text-orange-400';
            default: return 'text-zinc-400';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-400">Loading exam...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Pre-Exam Security Check</h1>
                    <p className="text-zinc-400">{exam?.title}</p>
                </div>

                {/* Main Card */}
                <div className="glass-card p-8">
                    {/* Camera Preview */}
                    <div className="relative mb-6 rounded-xl overflow-hidden bg-zinc-900 aspect-video">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover scale-x-[-1]"
                        />

                        {checks.camera.status === 'pending' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                <p className="text-zinc-400">Camera preview will appear here</p>
                            </div>
                        )}

                        {checks.camera.status === 'failed' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
                                <div className="text-center">
                                    <span className="text-4xl mb-2 block">🚫</span>
                                    <p className="text-red-400">Camera access denied</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-4 mb-8">
                        {Object.entries(checks).map(([key, value]) => (
                            <div
                                key={key}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${value.status === 'passed'
                                        ? 'bg-green-900/10 border-green-700/50'
                                        : value.status === 'failed'
                                            ? 'bg-red-900/10 border-red-700/50'
                                            : value.status === 'action'
                                                ? 'bg-orange-900/10 border-orange-700/50'
                                                : 'bg-zinc-800/50 border-zinc-700/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{getStatusIcon(value.status)}</span>
                                    <div>
                                        <p className="font-medium capitalize">
                                            {key === 'faceRegistered' ? 'Face Registration' :
                                                key === 'faceMatch' ? 'Identity Verification' :
                                                    key === 'singleFace' ? 'Environment Check' :
                                                        key === 'camera' ? 'Camera Access' : key}
                                        </p>
                                        <p className={`text-sm ${getStatusColor(value.status)}`}>
                                            {value.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                {value.status === 'action' && key === 'faceRegistered' && (
                                    <button
                                        onClick={() => {
                                            if (cameraStream) {
                                                cameraStream.getTracks().forEach(track => track.stop());
                                                setCameraStream(null);
                                            }
                                            setShowFaceRegistration(true);
                                        }}
                                        className="btn-primary text-sm"
                                    >
                                        Register Face
                                    </button>
                                )}

                                {value.status === 'failed' && (
                                    <button
                                        onClick={() => retryCheck(key)}
                                        className="btn-secondary text-sm"
                                    >
                                        Retry
                                    </button>
                                )}

                                {value.status === 'checking' && (
                                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Instructions */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">📋 Requirements:</h4>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• Stay in a well-lit environment</li>
                            <li>• Ensure only you are visible in the camera</li>
                            <li>• Keep your face centered and clearly visible</li>
                            <li>• The exam will run in fullscreen mode</li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/student')}
                            className="btn-secondary flex-1"
                        >
                            ← Cancel
                        </button>
                        <button
                            onClick={beginExam}
                            disabled={!allChecksPassed}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {allChecksPassed ? (
                                <>🚀 Begin Exam</>
                            ) : (
                                <>Complete All Checks</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-zinc-500 text-center mt-4">
                    🔒 Your exam session will be monitored for security purposes
                </p>
            </div>

            {/* Face Registration Modal */}
            <FaceRegistration
                isOpen={showFaceRegistration}
                onClose={() => setShowFaceRegistration(false)}
                onSuccess={handleFaceRegistrationSuccess}
            />
        </div>
    );
};

export default ExamPrecheck;
