import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Organization } from '@uswds-pt/shared';
import { DefinitionListSection } from './shared/DefinitionListSection';

interface OrgSettingsProps {
  organization: Organization;
  updateOrganization: (updates: {
    name?: string;
    description?: string;
    stateDefinitions?: Array<{ id: string; name: string }>;
    userDefinitions?: Array<{ id: string; name: string }>;
  }) => Promise<Organization | null>;
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

  // --- State definitions CRUD ---
  const stateDefinitions = organization.stateDefinitions || [];

  const addState = useCallback(async (name: string) => {
    const newItem = { id: `state-${Date.now()}`, name };
    await updateOrganization({ stateDefinitions: [...stateDefinitions, newItem] });
  }, [stateDefinitions, updateOrganization]);

  const renameState = useCallback(async (id: string, name: string) => {
    const updated = stateDefinitions.map(s => s.id === id ? { ...s, name } : s);
    await updateOrganization({ stateDefinitions: updated });
  }, [stateDefinitions, updateOrganization]);

  const removeState = useCallback(async (id: string) => {
    const updated = stateDefinitions.filter(s => s.id !== id);
    await updateOrganization({ stateDefinitions: updated });
  }, [stateDefinitions, updateOrganization]);

  // --- User definitions CRUD ---
  const userDefinitions = organization.userDefinitions || [];

  const addUser = useCallback(async (name: string) => {
    const newItem = { id: `user-${Date.now()}`, name };
    await updateOrganization({ userDefinitions: [...userDefinitions, newItem] });
  }, [userDefinitions, updateOrganization]);

  const renameUser = useCallback(async (id: string, name: string) => {
    const updated = userDefinitions.map(u => u.id === id ? { ...u, name } : u);
    await updateOrganization({ userDefinitions: updated });
  }, [userDefinitions, updateOrganization]);

  const removeUser = useCallback(async (id: string) => {
    const updated = userDefinitions.filter(u => u.id !== id);
    await updateOrganization({ userDefinitions: updated });
  }, [userDefinitions, updateOrganization]);

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

      <div className="team-settings-section">
        <h2>Visibility Dimensions</h2>
        <p style={{ color: 'var(--color-base-light)', marginTop: '4px', marginBottom: '16px' }}>
          Define states and user personas to toggle component visibility in prototypes.
        </p>
        <DefinitionListSection
          title="States"
          items={stateDefinitions}
          onAdd={addState}
          onRename={renameState}
          onRemove={removeState}
          placeholder="State name..."
          deleteConfirmMessage={(name) =>
            `Delete state "${name}"? Components tagged with only this state will become visible in all states.`
          }
        />

        <hr className="states-panel-divider" />

        <DefinitionListSection
          title="Users"
          items={userDefinitions}
          onAdd={addUser}
          onRename={renameUser}
          onRemove={removeUser}
          placeholder="User name..."
          deleteConfirmMessage={(name) =>
            `Delete user "${name}"? Components tagged with only this user will become visible for all users.`
          }
        />
      </div>
    </div>
  );
}
