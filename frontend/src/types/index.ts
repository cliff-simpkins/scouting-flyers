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
