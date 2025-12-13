import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';

// Google OAuth Client ID - Replace with your own from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CreateExam from './pages/CreateExam';
import ExamDetail from './pages/ExamDetail';
import TakeExam from './pages/TakeExam';
import Results from './pages/Results';
import SubmissionHistory from './pages/SubmissionHistory';
import Analytics from './pages/Analytics';

// Components
import MobileBlocker from './components/MobileBlocker';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'TEACHER' ? '/teacher' : '/student'} replace />;
  }

  return children;
};

// Dashboard Redirect
const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'TEACHER' ? '/teacher' : '/student'} replace />;
};

function App() {
  return (
    <MobileBlocker>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#18181b',
                  color: '#fff',
                  border: '1px solid #27272a',
                  padding: '16px',
                  fontSize: '14px'
                },
                success: {
                  duration: 4000,
                  iconTheme: { primary: '#22c55e', secondary: '#fff' }
                },
                error: {
                  duration: 6000,
                  iconTheme: { primary: '#ef4444', secondary: '#fff' }
                }
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Dashboard Redirect */}
              <Route path="/" element={<DashboardRedirect />} />

              {/* Teacher Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/create"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <CreateExam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/exam/:id"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <ExamDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/analytics"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam/:id"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <TakeExam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/results/:id"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <Results />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <SubmissionHistory />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    </MobileBlocker>
  );
}

export default App;
