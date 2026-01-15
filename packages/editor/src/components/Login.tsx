import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Demo credentials for easy testing
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

export function Login() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');

  const { login, register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch {
      // Error is handled by useAuth
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <h1>{isRegister ? 'Create Account' : 'Sign In'}</h1>

        <div
          style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d7ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#1a4480',
          }}
        >
          <strong>Demo Mode:</strong> Credentials are pre-filled.{' '}
          {isRegister
            ? 'Click "Create Account" to register.'
            : 'Click "Sign In" to continue, or register first if needed.'}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isLoading
              ? 'Loading...'
              : isRegister
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Create one
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
