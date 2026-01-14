import { useState, useRef, useEffect } from 'react';
import type { Team, Role } from '@uswds-pt/shared';
import { getRoleBadge } from '../lib/roles';

interface TeamWithRole extends Team {
  role: Role;
  joinedAt: Date;
}

interface TeamSwitcherProps {
  teams: TeamWithRole[];
  currentTeam: TeamWithRole | null;
  onTeamChange: (teamId: string) => void;
  organizationName?: string;
  canCreateTeam?: boolean;
  onCreateTeamClick?: () => void;
}

export function TeamSwitcher({
  teams,
  currentTeam,
  onTeamChange,
  organizationName,
  canCreateTeam = false,
  onCreateTeamClick,
}: TeamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="team-switcher" ref={dropdownRef}>
      {organizationName && (
        <span className="team-switcher-org">{organizationName}</span>
      )}
      <button
        className="team-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="team-switcher-current">
          {currentTeam?.name || 'Select Team'}
        </span>
        <svg
          className={`team-switcher-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="team-switcher-dropdown">
          <ul role="listbox">
            {teams.map((team) => (
              <li key={team.id} role="option" aria-selected={team.id === currentTeam?.id}>
                <button
                  className={`team-switcher-option ${team.id === currentTeam?.id ? 'active' : ''}`}
                  onClick={() => {
                    onTeamChange(team.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="team-switcher-option-name">{team.name}</span>
                  <span className="team-switcher-option-role">{getRoleBadge(team.role)}</span>
                </button>
              </li>
            ))}
          </ul>
          {canCreateTeam && onCreateTeamClick && (
            <div className="team-switcher-actions">
              <button
                className="team-switcher-create-btn"
                onClick={() => {
                  setIsOpen(false);
                  onCreateTeamClick();
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 1V13M1 7H13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Create New Team
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
