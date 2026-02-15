/**
 * API Request and Response Types
 *
 * Centralized type definitions for API request bodies and responses.
 * Used by both the API package and any frontend clients.
 */

// ============================================================================
// Authentication
// ============================================================================

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

// ============================================================================
// Organizations
// ============================================================================

export interface UpdateOrgBody {
  name?: string;
  description?: string;
  logoUrl?: string;
  stateDefinitions?: Array<{ id: string; name: string }>;
  userDefinitions?: Array<{ id: string; name: string }>;
}

// ============================================================================
// Teams
// ============================================================================

export interface CreateTeamBody {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateTeamBody {
  name?: string;
  description?: string;
}

export interface AddMemberBody {
  userId: string;
  role?: string;
}

export interface UpdateMemberBody {
  role: string;
}

// ============================================================================
// Prototypes
// ============================================================================

export interface CreatePrototypeBody {
  name: string;
  description?: string;
  htmlContent?: string;
  grapesData?: Record<string, unknown>;
  teamId: string;
}

export interface UpdatePrototypeBody {
  name?: string;
  description?: string;
  htmlContent?: string;
  grapesData?: Record<string, unknown>;
}

// ============================================================================
// Invitations
// ============================================================================

export interface CreateInvitationBody {
  email: string;
  role?: string;
}


