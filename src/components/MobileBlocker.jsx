import { useState, useEffect } from 'react';

const MobileBlocker = ({ children }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkDevice = () => {
            // Check user agent for mobile devices
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;

            // Regex patterns for mobile devices
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

            // Also check screen width as backup
            const isSmallScreen = window.innerWidth < 768;

            // Check if touch is primary input
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Determine if mobile
            const mobile = mobileRegex.test(userAgent.toLowerCase()) || (isSmallScreen && isTouchDevice);

            setIsMobile(mobile);
            setIsChecking(false);
        };

        checkDevice();

        // Re-check on resize (for responsive testing)
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    // Loading state
    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Mobile blocked screen
    if (isMobile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
                <div className="max-w-md w-full text-center">
                    {/* Icon */}
                    <div className="w-24 h-24 mx-auto mb-8 bg-red-600/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Desktop Only
                    </h1>

                    {/* Message */}
                    <div className="glass-card p-6 mb-6">
                        <div className="flex items-start gap-4 text-left">
                            <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Exam Integrity Required
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    To ensure academic integrity and enable AI proctoring features,
                                    Sentinel requires a <span className="text-white font-medium">desktop or laptop computer</span> with
                                    a webcam.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="glass-card p-6 text-left">
                        <h4 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
                            Requirements
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-zinc-300">
                                <span className="w-6 h-6 bg-indigo-600/20 rounded flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                    </svg>
                                </span>
                                Desktop or Laptop Computer
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300">
                                <span className="w-6 h-6 bg-indigo-600/20 rounded flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </span>
                                Working Webcam
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300">
                                <span className="w-6 h-6 bg-indigo-600/20 rounded flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                                    </svg>
                                </span>
                                Stable Internet Connection
                            </li>
                        </ul>
                    </div>

                    {/* Brand */}
                    <div className="mt-8">
                        <p className="text-zinc-600 text-sm">
                            Powered by <span className="text-gradient font-semibold">Sentinel</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop - show app normally
    return children;
};

export default MobileBlocker;
