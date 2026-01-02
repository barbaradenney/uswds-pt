import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrototypes, deletePrototype, type LocalPrototype } from '../lib/localStorage';

/**
 * Home page for demo mode (when no API is configured)
 * Shows saved prototypes and option to create new ones
 */
export function Home() {
  const navigate = useNavigate();
  const [prototypes, setPrototypes] = useState<LocalPrototype[]>([]);

  useEffect(() => {
    setPrototypes(getPrototypes());
  }, []);

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prototype?')) {
      return;
    }
    deletePrototype(id);
    setPrototypes(getPrototypes());
  }

  function handleNewPrototype() {
    // Navigate to /new which will create a fresh editor
    navigate('/new');
  }

  function handleEditPrototype(id: string) {
    navigate(`/edit/${id}`);
  }

  return (
    <div className="prototype-list-container">
      <div className="prototype-list-header">
        <div>
          <h1>USWDS Prototyping Tool</h1>
          <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
            Build prototypes with USWDS Web Components
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleNewPrototype}>
          + New Prototype
        </button>
      </div>

      {prototypes.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}
        >
          <h2 style={{ marginBottom: '8px' }}>Welcome</h2>
          <p style={{ color: 'var(--color-base-light)', marginBottom: '24px' }}>
            Create interactive prototypes using the U.S. Web Design System components.
            Drag and drop components, customize properties, and preview your designs.
          </p>
          <button className="btn btn-primary" onClick={handleNewPrototype}>
            + New Prototype
          </button>

          <div style={{ marginTop: '32px', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '16px' }}>Features</h3>
            <ul style={{ color: 'var(--color-base-light)', lineHeight: '1.8' }}>
              <li>Drag-and-drop USWDS components</li>
              <li>Customize component properties</li>
              <li>Responsive grid layouts</li>
              <li>Live preview</li>
              <li>Export clean HTML</li>
              <li>Embed in documentation</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="prototype-grid">
          {prototypes.map((prototype) => (
            <div
              key={prototype.id}
              className="prototype-card"
              onClick={() => handleEditPrototype(prototype.id)}
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
                  onClick={(e) => handleDelete(prototype.id, e)}
                >
                  Delete
                </button>
              </div>
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
