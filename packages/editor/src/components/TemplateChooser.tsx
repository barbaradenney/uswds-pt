/**
 * Template Chooser
 *
 * Displays a card grid of starter templates when creating a new prototype.
 * Rendered as an early return in Editor.tsx before the GrapesJS canvas mounts.
 */

import { useState } from 'react';
import { STARTER_TEMPLATES } from '@uswds-pt/adapter';

interface TemplateChooserProps {
  onSelect: (templateId: string, branchName?: string) => void;
  onBack: () => void;
  /** Hide the branch option (e.g., in demo mode) */
  hideBranchOption?: boolean;
}

export function TemplateChooser({ onSelect, onBack, hideBranchOption }: TemplateChooserProps) {
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [branchName, setBranchName] = useState('');

  const handleSelect = (templateId: string) => {
    onSelect(templateId, showBranchInput && branchName.trim() ? branchName.trim() : undefined);
  };

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

        {/* Optional branch name input */}
        {!hideBranchOption && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'var(--color-base, #565c65)',
              }}
            >
              <input
                type="checkbox"
                checked={showBranchInput}
                onChange={(e) => setShowBranchInput(e.target.checked)}
              />
              Start on a branch
            </label>
            {showBranchInput && (
              <div style={{ marginTop: '8px', maxWidth: '300px' }}>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g., redesign-header"
                  maxLength={100}
                  aria-label="Branch name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-base-light, #71767a)' }}>
                  A branch lets you experiment without affecting the main version.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="prototype-grid">
          {STARTER_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="prototype-card"
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(template.id);
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
