import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Draggable from 'react-draggable';
import * as faceapi from 'face-api.js';
import api from '../services/api';
import { FACE_DETECTION_CONFIG } from '../config';
import { formatTime } from '../utils';

// Fisher-Yates shuffle algorithm for question randomization
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const TakeExam = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null); // For react-draggable React 19 compatibility

    // Get verified state from ExamPrecheck navigation
    const { verified, storedDescriptor: passedDescriptor } = location.state || {};

    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [malpracticeEvents, setMalpracticeEvents] = useState([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [faceStatus, setFaceStatus] = useState('loading');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState([]); // Randomized question order
    const [examStarted, setExamStarted] = useState(false); // Track if exam is in progress
    const warningsRef = useRef(0);

    // Face matching state - now initialized from precheck
    const [storedDescriptor, setStoredDescriptor] = useState(null);
    const faceRegistered = !!passedDescriptor; // True if came from precheck with descriptor
    const showFaceRegistration = false; // No longer needed - handled by precheck
    const checkingFace = false; // No longer needed - handled by precheck

    // Redirect if not verified (accessed directly without precheck)
    useEffect(() => {
        if (!verified) {
            toast.error('Please complete the pre-exam checks first');
            navigate(`/student/exam/${id}`);
        }
    }, [verified, navigate, id]);

    // Initialize stored descriptor from precheck
    useEffect(() => {
        if (passedDescriptor) {
            setStoredDescriptor(new Float32Array(passedDescriptor));
        }
    }, [passedDescriptor]);

    // Keep warnings ref in sync
    useEffect(() => {
        warningsRef.current = warnings;
    }, [warnings]);

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                console.log('Face detection models loaded');
            } catch (error) {
                console.error('Error loading face detection models:', error);
                setFaceStatus('no-models');
                // Continue without face detection if models fail to load
            }
        };
        loadModels();
    }, []);

    // Fetch exam
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const response = await api.get(`/exams/${id}`);
                const examData = response.data;

                // Shuffle questions for this student
                if (examData.questions && examData.questions.length > 0) {
                    setShuffledQuestions(shuffleArray(examData.questions));
                }

                setExam(examData);
                setTimeLeft(examData.duration * 60);
                setExamStarted(true);
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to load exam');
                navigate('/student');
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id, navigate]);

    // Timer - starts immediately since precheck is complete
    useEffect(() => {
        if (timeLeft <= 0 || loading || !exam) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, loading, exam]);

    // Prevent accidental page refresh/close during exam
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (examStarted && !submitting) {
                e.preventDefault();
                e.returnValue = 'You have an exam in progress. Leaving will submit your current answers. Are you sure?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [examStarted, submitting]);

    // Tab visibility detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && exam) {
                const newWarnings = warningsRef.current + 1;
                setWarnings(newWarnings);
                setMalpracticeEvents(prev => [...prev, {
                    type: 'TAB_SWITCH',
                    timestamp: new Date().toISOString()
                }]);

                if (newWarnings >= 3) {
                    toast.error('⚠️ Maximum warnings reached! Auto-submitting exam.');
                    handleSubmit(true);
                } else {
                    toast.error(`⚠️ Warning ${newWarnings}/3: Tab switch detected!`);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [exam]);

    // NEW: Screenshot Prevention - Blur content when window loses focus
    const [isBlurred, setIsBlurred] = useState(false);

    useEffect(() => {
        const handleBlur = () => {
            if (exam) {
                setIsBlurred(true);
                setMalpracticeEvents(prev => [...prev, {
                    type: 'WINDOW_BLUR',
                    timestamp: new Date().toISOString()
                }]);
            }
        };

        const handleFocus = () => {
            setIsBlurred(false);
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [exam]);

    // NEW: Copy/Paste Block - Disable keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!exam) return;

            // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+P, Ctrl+S
            if (e.ctrlKey && ['c', 'v', 'a', 'p', 's', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                toast.error('⚠️ Copy/Paste is disabled during exam', { id: 'copy-paste-blocked' });
                setMalpracticeEvents(prev => [...prev, {
                    type: 'COPY_PASTE_ATTEMPT',
                    key: e.key,
                    timestamp: new Date().toISOString()
                }]);
            }

            // Block PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                toast.error('⚠️ Screenshots are disabled during exam', { id: 'screenshot-blocked' });
            }

            // Block F12 (DevTools)
            if (e.key === 'F12') {
                e.preventDefault();
                toast.error('⚠️ Developer tools are disabled during exam', { id: 'devtools-blocked' });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [exam]);

    // NEW: Right-Click Block
    useEffect(() => {
        const handleContextMenu = (e) => {
            if (exam) {
                e.preventDefault();
                toast.error('⚠️ Right-click is disabled during exam', { id: 'right-click-blocked' });
                return false;
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [exam]);

    // NEW: Fullscreen Enforcement
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fullscreenWarningShown, setFullscreenWarningShown] = useState(false);

    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);

            if (!isCurrentlyFullscreen && exam && !submitting) {
                toast.error('⚠️ Please return to fullscreen mode!', { id: 'fullscreen-warning' });
                setMalpracticeEvents(prev => [...prev, {
                    type: 'FULLSCREEN_EXIT',
                    timestamp: new Date().toISOString()
                }]);

                // Re-request fullscreen after 2 seconds
                setTimeout(() => {
                    if (!document.fullscreenElement && !submitting) {
                        enterFullscreen();
                    }
                }, 2000);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [exam, submitting, enterFullscreen]);

    // Request fullscreen when exam loads
    useEffect(() => {
        if (exam && !fullscreenWarningShown) {
            setFullscreenWarningShown(true);
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <p className="font-medium">📺 Fullscreen Mode Required</p>
                    <p className="text-sm text-zinc-400">Click to enter fullscreen for exam security.</p>
                    <button
                        onClick={() => {
                            enterFullscreen();
                            toast.dismiss(t.id);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Enter Fullscreen
                    </button>
                </div>
            ), { duration: 10000, id: 'fullscreen-prompt' });
        }
    }, [exam, fullscreenWarningShown, enterFullscreen]);

    // Camera setup - don't start if FaceRegistration modal is open
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 240 }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Explicitly play to ensure video starts on all browsers
                    await videoRef.current.play().catch(e => console.log('Video play error:', e));
                    setCameraActive(true);
                    setFaceStatus('checking');
                }
            } catch (error) {
                console.error('Camera error:', error);
                toast.error('Camera access required for proctoring');
                setFaceStatus('no-camera');
            }
        };

        // Only start camera if exam loaded AND face registration modal is not showing
        if (!loading && exam && !showFaceRegistration) {
            startCamera();
        }

        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [loading, exam, showFaceRegistration]);

    // Real face detection using face-api.js
    useEffect(() => {
        if (!cameraActive || !modelsLoaded || !videoRef.current) return;

        let noFaceCount = 0;
        const MAX_NO_FACE_COUNT = 3; // Warn after 3 consecutive no-face detections

        const detectFaces = async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            try {
                const detections = await faceapi.detectAllFaces(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                );

                const faceCount = detections.length;

                if (faceCount === 0) {
                    noFaceCount++;
                    if (noFaceCount >= MAX_NO_FACE_COUNT) {
                        setFaceStatus('none');
                        toast.error('⚠️ Face not detected! Please stay in front of the camera.');
                        setMalpracticeEvents(prev => [...prev, {
                            type: 'FACE_NOT_DETECTED',
                            timestamp: new Date().toISOString()
                        }]);
                        noFaceCount = 0; // Reset to avoid spam
                    }
                } else if (faceCount > 1) {
                    setFaceStatus('multiple');
                    toast.error('⚠️ Multiple faces detected! This has been logged.');
                    setMalpracticeEvents(prev => [...prev, {
                        type: 'MULTIPLE_FACES',
                        timestamp: new Date().toISOString(),
                        faceCount
                    }]);
                    noFaceCount = 0;
                } else {
                    setFaceStatus('detected');
                    noFaceCount = 0;
                }
            } catch (error) {
                console.error('Face detection error:', error);
            }
        };

        // Run face detection every 3 seconds
        const intervalId = setInterval(detectFaces, 3000);
        // Initial detection
        const timeoutId = setTimeout(detectFaces, 1000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [cameraActive, modelsLoaded]);

    // Face Identity Verification (compare with stored descriptor)
    useEffect(() => {
        if (!cameraActive || !modelsLoaded || !storedDescriptor || !faceRegistered) return;

        const verifyIdentity = async () => {
            if (!videoRef.current || videoRef.current.paused) return;

            try {
                // Detect face with descriptor
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    // Calculate distance between current and stored descriptor
                    const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

                    // Threshold from config (default: 0.6, lower = stricter)
                    if (distance > FACE_DETECTION_CONFIG.MATCH_THRESHOLD) {
                        toast.error('⚠️ Face mismatch detected! This is being logged.', { id: 'face-mismatch' });
                        setMalpracticeEvents(prev => [...prev, {
                            type: 'FACE_MISMATCH',
                            timestamp: new Date().toISOString(),
                            distance: distance.toFixed(3)
                        }]);
                    }
                }
            } catch (error) {
                console.error('Face verification error:', error);
            }
        };

        // Verify identity every 30 seconds (less frequent than detection)
        const verifyInterval = setInterval(verifyIdentity, 30000);
        // Initial verification after 5 seconds
        const verifyTimeout = setTimeout(verifyIdentity, 5000);

        return () => {
            clearInterval(verifyInterval);
            clearTimeout(verifyTimeout);
        };
    }, [cameraActive, modelsLoaded, storedDescriptor, faceRegistered]);

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const response = await api.post(`/submissions/exam/${id}`, {
                answers,
                warningsCount: warningsRef.current,
                malpracticeEvents
            });

            if (autoSubmit) {
                toast.success('Exam auto-submitted!');
            } else {
                toast.success('Exam submitted successfully!');
            }

            // Stop camera
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

            // Exit fullscreen on submit
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }

            navigate(`/student/results/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit exam');
            setSubmitting(false);
        }
    }, [id, answers, malpracticeEvents, submitting, navigate]);

    // formatTime is imported from utils/index.js

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

    const question = shuffledQuestions[currentQuestion];
    const totalQuestions = shuffledQuestions.length;
    const isLowTime = timeLeft < 300; // Less than 5 minutes

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Timer Pill */}
            <div className={isLowTime ? 'timer-pill-warning' : 'timer-pill'}>
                ⏱️ {formatTime(timeLeft)}
                {warnings > 0 && (
                    <span className="ml-3 text-yellow-400">⚠️ {warnings}/3</span>
                )}
            </div>

            {/* Main Content - with blur protection and copy prevention */}
            <div
                className={`max-w-4xl mx-auto px-6 py-20 transition-all duration-300 ${isBlurred ? 'blur-lg pointer-events-none' : ''}`}
                style={{ userSelect: 'none' }}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
            >
                {/* Blur Overlay Warning */}
                {isBlurred && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                        <div className="text-center">
                            <p className="text-4xl mb-4">⚠️</p>
                            <p className="text-xl font-semibold text-red-400">Window Focus Lost</p>
                            <p className="text-zinc-400 mt-2">Click here to continue your exam</p>
                        </div>
                    </div>
                )}

                {/* Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400">Question {currentQuestion + 1} of {totalQuestions}</span>
                        <span className="text-zinc-400">{Object.keys(answers).length} answered</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <div className="glass-card p-8 mb-6">
                    <h2 className="text-2xl font-semibold mb-6">{question?.text}</h2>

                    <div className="space-y-3">
                        {question?.options?.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => setAnswers({ ...answers, [question.id]: index })}
                                className={`w-full p-4 rounded-xl text-left transition-all duration-200 border ${answers[question.id] === index
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                                    }`}
                            >
                                <span className="inline-block w-8 h-8 rounded-lg bg-zinc-700 text-center leading-8 mr-3 text-sm">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                        className="btn-secondary disabled:opacity-50"
                    >
                        ← Previous
                    </button>

                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        {shuffledQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentQuestion(i)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${i === currentQuestion
                                    ? 'bg-indigo-600 text-white'
                                    : answers[q.id] !== undefined
                                        ? 'bg-green-600/20 text-green-400 border border-green-600'
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {currentQuestion === totalQuestions - 1 ? (
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            className="btn-primary flex items-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                '✓ Submit Exam'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentQuestion(prev => prev + 1)}
                            className="btn-primary"
                        >
                            Next →
                        </button>
                    )}
                </div>
            </div>

            {/* Webcam PIP */}
            <Draggable bounds="body" nodeRef={dragRef}>
                <div ref={dragRef} className="pip-container">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Face status indicator */}
                    <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium ${faceStatus === 'detected' ? 'bg-green-600' :
                        faceStatus === 'none' ? 'bg-yellow-600' :
                            faceStatus === 'multiple' ? 'bg-red-600' :
                                faceStatus === 'loading' ? 'bg-blue-600' : 'bg-zinc-600'
                        }`}>
                        {faceStatus === 'detected' ? '✓ Face OK' :
                            faceStatus === 'none' ? '⚠ No Face' :
                                faceStatus === 'multiple' ? '⚠ Multiple' :
                                    faceStatus === 'loading' ? '⏳ Loading...' :
                                        faceStatus === 'checking' ? '🔍 Checking...' : '...'}
                    </div>
                    {/* Proctoring badge */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-600/80 rounded text-[10px] font-bold text-white">
                        🔴 LIVE
                    </div>
                </div>
            </Draggable>

            {/* Models loading indicator */}
            {!modelsLoaded && faceStatus !== 'no-models' && (
                <div className="fixed bottom-6 left-6 glass-card px-4 py-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        Loading AI proctoring...
                    </div>
                </div>
            )}

            {/* Face verification status indicator */}
            {faceRegistered && storedDescriptor && (
                <div className="fixed bottom-6 left-6 glass-card px-4 py-2 text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                        <span>🧑</span>
                        Face Verified
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeExam;

