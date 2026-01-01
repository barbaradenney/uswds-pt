import { Routes, Route, Navigate } from 'react-router-dom';
import { Editor } from './components/Editor';
import { PrototypeList } from './components/PrototypeList';
import { Login } from './components/Login';
import { Preview } from './components/Preview';
import { Embed } from './components/Embed';
import { useAuth } from './hooks/useAuth';

// Check if we're in demo mode (no API URL configured)
const isDemoMode = !import.meta.env.VITE_API_URL;

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // In demo mode, skip auth entirely and go straight to editor
  if (isDemoMode) {
    return (
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/edit/:slug" element={<Editor />} />
        <Route path="/new" element={<Editor />} />
        <Route path="/preview/:slug" element={<Preview />} />
        <Route path="/embed/:slug" element={<Embed />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
    </Routes>
  );
}

export default App;
