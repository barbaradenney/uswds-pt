/**
 * Template Chooser
 *
 * Displays a card grid of starter templates when creating a new prototype.
 * Rendered as an early return in Editor.tsx before the GrapesJS canvas mounts.
 */

import { STARTER_TEMPLATES } from '@uswds-pt/adapter';

interface TemplateChooserProps {
  onSelect: (templateId: string) => void;
  onBack: () => void;
}

export function TemplateChooser({ onSelect, onBack }: TemplateChooserProps) {
  return (
    <div className="prototype-list-container">
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: 'var(--color-base-light, #71767a)',
            padding: '0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          &larr; Back to prototypes
        </button>

        <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem', fontWeight: 700 }}>
          Choose a Starting Template
        </h1>
        <p style={{ margin: '0 0 32px', color: 'var(--color-base-light, #71767a)' }}>
          Pick a layout to start with. You can customize everything in the editor.
        </p>

        <div className="prototype-grid">
          {STARTER_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="prototype-card"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(template.id);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '80px',
                  marginBottom: '12px',
                  backgroundColor: 'var(--color-base-lightest, #f0f0f0)',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{ width: '40px', height: '40px', color: 'var(--color-base, #565c65)' }}
                  dangerouslySetInnerHTML={{ __html: template.icon }}
                />
              </div>
              <h3 className="prototype-card-title" style={{ margin: '0 0 4px' }}>
                {template.label}
              </h3>
              <p
                className="prototype-card-meta"
                style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.4 }}
              >
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
