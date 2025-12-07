import { Routes, Route, Navigate } from 'react-router-dom';
import { Editor } from './components/Editor';
import { PrototypeList } from './components/PrototypeList';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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
