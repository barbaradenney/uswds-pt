/**
 * Template Chooser
 *
 * Displays a required name input and a card grid of starter templates
 * when creating a new prototype. The name becomes the prototype's
 * branch slug (shown as a preview below the input).
 *
 * Rendered as an early return in Editor.tsx before the GrapesJS canvas mounts.
 */

import { useState } from 'react';
import { STARTER_TEMPLATES } from '@uswds-pt/adapter';
import DOMPurify from 'dompurify';
import { toBranchSlug } from '@uswds-pt/shared';

interface TemplateChooserProps {
  onSelect: (templateId: string, name: string) => void;
  onBack: () => void;
}

export function TemplateChooser({ onSelect, onBack }: TemplateChooserProps) {
  const [name, setName] = useState('');

  const slugPreview = name.trim() ? toBranchSlug(name) : '';
  const isNameValid = name.trim().length > 0;

  const handleSelect = (templateId: string) => {
    if (!isNameValid) return;
    onSelect(templateId, name.trim());
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
          Create a New Prototype
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--color-base-light, #71767a)' }}>
          Name your prototype and pick a layout to start with.
        </p>

        {/* Name input */}
        <div style={{ marginBottom: '32px', maxWidth: '400px' }}>
          <label
            htmlFor="prototype-name"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '4px',
              color: 'var(--color-base-ink, #1b1b1b)',
            }}
          >
            Name your prototype
          </label>
          <input
            id="prototype-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Contact Form Redesign"
            maxLength={100}
            aria-label="Prototype name"
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
          {slugPreview && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-base-light, #71767a)' }}>
              GitHub branch: uswds-pt/{slugPreview}
            </p>
          )}
        </div>

        <div className="prototype-grid">
          {STARTER_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="prototype-card"
              role="button"
              tabIndex={isNameValid ? 0 : -1}
              onClick={() => handleSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(template.id);
                }
              }}
              style={{
                cursor: isNameValid ? 'pointer' : 'not-allowed',
                opacity: isNameValid ? 1 : 0.5,
              }}
              aria-disabled={!isNameValid}
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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(template.icon) }}
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
