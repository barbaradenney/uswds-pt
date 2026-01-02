import { useNavigate } from 'react-router-dom';

/**
 * Home page for demo mode (when no API is configured)
 * Shows a welcome screen with option to start a new prototype
 */
export function Home() {
  const navigate = useNavigate();

  return (
    <div className="prototype-list-container">
      <div className="prototype-list-header">
        <div>
          <h1>USWDS Prototyping Tool</h1>
          <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
            Build prototypes with USWDS Web Components
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}
      >
        <h2 style={{ marginBottom: '8px' }}>Welcome</h2>
        <p style={{ color: 'var(--color-base-light)', marginBottom: '24px' }}>
          Create interactive prototypes using the U.S. Web Design System components.
          Drag and drop components, customize properties, and preview your designs.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/new')}>
          + New Prototype
        </button>
      </div>

      <div style={{ maxWidth: '600px', margin: '32px auto', padding: '0 16px' }}>
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
  );
}
