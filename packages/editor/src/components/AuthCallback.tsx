/**
 * Auth Callback
 *
 * Handles the OAuth callback from GitHub. Reads the JWT token from the URL,
 * stores it in localStorage, fetches user data, and redirects to home.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const token = params.get('token');
    const errorParam = params.get('error');

    // Immediately clear the token from the URL to prevent leaking via Referer or history
    if (token || errorParam) {
      window.history.replaceState(null, '', window.location.pathname + '#/auth/callback');
    }

    if (errorParam) {
      const messages: Record<string, string> = {
        oauth_denied: 'GitHub authorization was denied.',
        oauth_failed: 'GitHub sign-in failed. Please try again.',
        no_email: 'No verified email found on your GitHub account. Please add a verified email to GitHub.',
        account_disabled: 'This account has been disabled.',
      };
      setError(messages[errorParam] || 'Sign-in failed.');
      return;
    }

    if (!token) {
      setError('No authentication token received.');
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('Failed to complete sign-in.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card card">
          <h1>Sign-In Error</h1>
          <div className="login-error">{error}</div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%', marginTop: '16px' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Completing sign-in...</p>
    </div>
  );
}
