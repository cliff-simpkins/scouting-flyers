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
  PROJECT_VIEWER = 'project_viewer'
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

// Zone interfaces
export interface Zone {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  geometry: GeoJSON.Geometry;
  color?: string | null;
  kml_metadata?: any;
  created_at?: string;
  updated_at?: string;
}

// Zone Assignment interfaces
export interface ZoneAssignment {
  id: string;
  zone_id: string;
  volunteer_id: string;
  assigned_by: string;
  assigned_at: string;
  status: 'assigned' | 'in_progress' | 'completed';
  started_at?: string | null;
  completed_at?: string | null;
  volunteer_name?: string;
  volunteer_email?: string;
  volunteer_picture_url?: string | null;
}

export interface ZoneWithAssignments extends Zone {
  assignments?: ZoneAssignment[];
}

export interface ZoneAssignmentWithZone extends ZoneAssignment {
  zone_name: string;
  zone_color: string | null;
  project_id: string;
  project_name: string;
  zone_geometry: GeoJSON.Geometry;
}

// Zone Assignment Request types
export interface ZoneAssignmentCreateRequest {
  zone_id: string;
  volunteer_id: string;
}

export interface VolunteerInfo {
  id: string;
  name: string;
  email: string;
  picture_url?: string | null;
  current_assignments_count: number;
}
