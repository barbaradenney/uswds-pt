import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Organization } from '@uswds-pt/shared';

interface OrgSettingsProps {
  organization: Organization;
  updateOrganization: (updates: { name?: string; description?: string }) => Promise<Organization | null>;
}

export function OrgSettings({ organization, updateOrganization }: OrgSettingsProps) {
  const navigate = useNavigate();
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  async function handleSaveOrgName() {
    if (!newOrgName.trim()) return;
    setIsSavingOrg(true);
    const result = await updateOrganization({ name: newOrgName.trim() });
    setIsSavingOrg(false);
    if (result) {
      setIsEditingOrgName(false);
    }
  }

  function handleStartEditOrgName() {
    setNewOrgName(organization.name);
    setIsEditingOrgName(true);
  }

  return (
    <div className="team-settings">
      <div className="team-settings-header">
        <div>
          <h1>Organization Settings</h1>
          <p style={{ color: 'var(--color-base-light)', marginTop: '4px' }}>
            Manage organization-level settings
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Back to Prototypes
        </button>
      </div>

      <div className="team-settings-section">
        <h2>Organization Name</h2>
        <div className="org-settings-row">
          <label>Name</label>
          {isEditingOrgName ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="form-input"
                style={{ width: '250px' }}
                disabled={isSavingOrg}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveOrgName();
                  if (e.key === 'Escape') setIsEditingOrgName(false);
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleSaveOrgName}
                disabled={isSavingOrg || !newOrgName.trim()}
              >
                {isSavingOrg ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditingOrgName(false)}
                disabled={isSavingOrg}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{organization.name}</span>
              <button
                className="btn btn-secondary"
                onClick={handleStartEditOrgName}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
