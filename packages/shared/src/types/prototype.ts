/**
 * Prototype and API Types
 */

// ============================================================================
// Organization & Team Types
// ============================================================================

/**
 * Role types for team memberships
 */
export type Role = 'org_admin' | 'team_admin' | 'team_member' | 'team_viewer';

/**
 * Invitation status types
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/**
 * Organization - top-level grouping for agencies/companies
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Team - subdivision within an organization
 */
export interface Team {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Team membership - connects users to teams with roles
 */
export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
  invitedBy?: string;
}

/**
 * Team membership with team details (used in user responses)
 */
export interface TeamMembershipWithTeam {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: Role;
  joinedAt: Date;
}

/**
 * Invitation - pending invitation for users to join teams
 */
export interface Invitation {
  id: string;
  email: string;
  teamId: string;
  role: Role;
  token: string;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
  acceptedAt?: Date;
  status: InvitationStatus;
}

/**
 * Invitation with team details (used in invitation list responses)
 */
export interface InvitationWithTeam extends Invitation {
  teamName: string;
  teamSlug: string;
  organizationId: string;
  organizationName: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * User with organization and team membership details
 */
export interface UserWithOrgAndTeams extends Omit<User, 'updatedAt'> {
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  teamMemberships: TeamMembershipWithTeam[];
}

export interface Prototype {
  id: string;
  slug: string;
  name: string;
  description?: string;
  htmlContent: string;
  grapesData: GrapesProjectData;
  teamId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  version?: number;
  contentChecksum?: string;
}

export interface PrototypeVersion {
  id: string;
  prototypeId: string;
  versionNumber: number;
  htmlContent: string;
  grapesData: GrapesProjectData;
  label?: string;
  contentChecksum?: string;
  createdAt: Date;
  createdBy?: string;
}

/**
 * GrapesJS project data structure
 * This is stored as JSONB in the database
 */
export interface GrapesProjectData {
  assets?: GrapesAsset[];
  styles?: GrapesStyle[];
  pages?: GrapesPage[];
  symbols?: unknown[];
  dataSources?: unknown[];
}

export interface GrapesAsset {
  type: string;
  src: string;
  unitDim?: string;
  height?: number;
  width?: number;
  name?: string;
}

export interface GrapesStyle {
  selectors: string[];
  style: Record<string, string>;
  mediaText?: string;
  atRuleType?: string;
}

export interface GrapesPage {
  id?: string;
  name?: string;
  component?: string;
  frames?: GrapesFrame[];
  /** Pre-rendered HTML for this page, stored at save time for reliable preview */
  htmlContent?: string;
}

export interface GrapesFrame {
  component?: GrapesComponentData;
}

export interface GrapesComponentData {
  type?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  classes?: string[];
  components?: GrapesComponentData[] | string;
  content?: string;
}

/**
 * API Request/Response Types
 */

export interface CreatePrototypeRequest {
  name: string;
  description?: string;
  htmlContent?: string;
  grapesData?: GrapesProjectData;
  teamId: string;
}

export interface UpdatePrototypeRequest {
  name?: string;
  description?: string;
  htmlContent?: string;
  grapesData?: GrapesProjectData;
}

export interface PrototypeListResponse {
  prototypes: Prototype[];
}

export interface ExportOptions {
  mode: 'snippet' | 'full';
  format?: 'html' | 'json';
  includeStyles?: boolean;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: UserWithOrgAndTeams | null;
}

// ============================================================================
// Organization & Team API Types
// ============================================================================

export interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
}

export interface CreateInvitationRequest {
  email: string;
  role?: Role;
}

export interface TeamListResponse {
  teams: Array<Team & { role: Role; joinedAt: Date }>;
}

export interface TeamMemberListResponse {
  members: Array<{
    id: string;
    email: string;
    name?: string;
    role: Role;
    joinedAt: Date;
  }>;
}

export interface InvitationListResponse {
  invitations: InvitationWithTeam[];
}

export interface AcceptInvitationResponse {
  message: string;
  membership: {
    teamId: string;
    role: Role;
    joinedAt: Date;
  };
}

// ============================================================================
// Global Symbol Types
// ============================================================================

/**
 * GrapesJS symbol structure (stored in symbolData)
 */
export interface GrapesJSSymbol {
  id: string;
  label: string;
  icon?: string;
  components: GrapesComponentData[];
  [key: string]: unknown; // Allow additional GrapesJS symbol properties
}

/**
 * Global symbol - shared across prototypes within a team
 */
export interface GlobalSymbol {
  id: string;
  teamId: string;
  name: string;
  symbolData: GrapesJSSymbol;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Symbol scope for distinguishing local vs global
 */
export type SymbolScope = 'local' | 'global';

/**
 * API Request/Response Types for Symbols
 */

export interface CreateGlobalSymbolRequest {
  name: string;
  symbolData: GrapesJSSymbol;
}

export interface UpdateGlobalSymbolRequest {
  name?: string;
  symbolData?: GrapesJSSymbol;
}

export interface GlobalSymbolListResponse {
  symbols: GlobalSymbol[];
}
