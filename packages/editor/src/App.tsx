import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load components for code splitting
const Editor = lazy(() => import('./components/Editor').then(m => ({ default: m.Editor })));
const PrototypeList = lazy(() => import('./components/PrototypeList').then(m => ({ default: m.PrototypeList })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Preview = lazy(() => import('./components/Preview').then(m => ({ default: m.Preview })));
const Embed = lazy(() => import('./components/Embed').then(m => ({ default: m.Embed })));
const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const TeamSettingsPage = lazy(() => import('./components/TeamSettingsPage').then(m => ({ default: m.TeamSettingsPage })));
const OrgSettingsPage = lazy(() => import('./components/OrgSettingsPage').then(m => ({ default: m.OrgSettingsPage })));
const AuthCallback = lazy(() => import('./components/AuthCallback').then(m => ({ default: m.AuthCallback })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}

// Check if we're in demo mode (no API URL configured)
const isDemoMode = !import.meta.env.VITE_API_URL;

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Use pathname as key to reset ErrorBoundary on route changes
  // This ensures errors don't persist when navigating between pages
  const errorBoundaryKey = location.pathname;

  // In demo mode, skip auth entirely - show home page with option to create prototype
  if (isDemoMode) {
    return (
      <ErrorBoundary key={errorBoundaryKey}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/edit/:slug" element={<Editor />} />
            <Route path="/new" element={<Editor />} />
            <Route path="/preview/:slug" element={<Preview />} />
            <Route path="/embed/:slug" element={<Embed />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <ErrorBoundary key={errorBoundaryKey}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Preview and embed routes are public - no auth required */}
          <Route path="/preview/:slug" element={<Preview />} />
          <Route path="/embed/:slug" element={<Embed />} />
          <Route
            path="/"
            element={
              isAuthenticated ? <PrototypeList /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/edit/:slug"
            element={
              isAuthenticated ? <Editor /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/new"
            element={
              isAuthenticated ? <Editor /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/teams/:teamId/settings"
            element={
              isAuthenticated ? <TeamSettingsPage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/org/settings"
            element={
              isAuthenticated ? <OrgSettingsPage /> : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
