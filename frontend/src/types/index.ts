/**
 * Core TypeScript types for the application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  picture_url?: string;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginResponse {
  authorization_url: string;
  state: string;
}

// Collaborator roles enum
export enum CollaboratorRole {
  OWNER = 'owner',
  ORGANIZER = 'organizer',
  VIEWER = 'viewer'
}

// Project interfaces
export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_by: string;
  invited_at: string;
  user_email?: string;
  user_name?: string;
}

export interface ProjectWithCollaborators extends Project {
  collaborators: Collaborator[];
}

// Request types
export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CollaboratorInviteRequest {
  email: string;
  role: CollaboratorRole;
}
