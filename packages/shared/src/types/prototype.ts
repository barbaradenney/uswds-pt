/**
 * Prototype and API Types
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Prototype {
  id: string;
  slug: string;
  name: string;
  description?: string;
  htmlContent: string;
  grapesData: GrapesProjectData;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface PrototypeVersion {
  id: string;
  prototypeId: string;
  versionNumber: number;
  htmlContent: string;
  grapesData: GrapesProjectData;
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
}

export interface UpdatePrototypeRequest {
  name?: string;
  description?: string;
  htmlContent?: string;
  grapesData?: GrapesProjectData;
}

export interface PrototypeListResponse {
  prototypes: Prototype[];
  total: number;
  page: number;
  limit: number;
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
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}
