import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Prototype } from '@uswds-pt/shared';
import { authFetch } from '../hooks/useAuth';
import { useAuth } from '../hooks/useAuth';

export function PrototypeList() {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    loadPrototypes();
  }, []);

  async function loadPrototypes() {
    try {
      setIsLoading(true);
      const response = await authFetch('/api/prototypes');

      if (!response.ok) {
        throw new Error('Failed to load prototypes');
      }

      const data = await response.json();
      setPrototypes(data.prototypes || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prototypes');
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function handleDelete(slug: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this prototype?')) {
      return;
    }

    try {
      const response = await authFetch(`/api/prototypes/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prototype');
      }

      setPrototypes((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="prototype-list-container">
      <div className="prototype-list-header">
        <div>
          <h1>My Prototypes</h1>
          {user && (
            <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
              Signed in as {user.email}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            + New Prototype
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: '16px' }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-screen" style={{ height: '300px' }}>
          <div className="loading-spinner" />
        </div>
      ) : prototypes.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <h2 style={{ marginBottom: '8px' }}>No prototypes yet</h2>
          <p style={{ color: 'var(--color-base-light)', marginBottom: '24px' }}>
            Create your first prototype to get started
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            Create Prototype
          </button>
        </div>
      ) : (
        <div className="prototype-grid">
          {prototypes.map((prototype) => (
            <div
              key={prototype.id}
              className="prototype-card"
              onClick={() => navigate(`/edit/${prototype.slug}`)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <h3 className="prototype-card-title">{prototype.name}</h3>
                <button
                  className="btn"
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.875rem',
                    color: 'var(--color-base-light)',
                  }}
                  onClick={(e) => handleDelete(prototype.slug, e)}
                >
                  Delete
                </button>
              </div>
              {prototype.description && (
                <p
                  style={{
                    color: 'var(--color-base-light)',
                    marginBottom: '12px',
                  }}
                >
                  {prototype.description}
                </p>
              )}
              <div className="prototype-card-meta">
                Updated {formatDate(prototype.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
