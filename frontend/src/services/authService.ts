/**
 * Authentication service
 */
import api from './api';
import { User, AuthResponse, LoginResponse } from '../types';

class AuthService {
  /**
   * Initiate Google OAuth login
   * Redirects user to Google consent screen
   */
  async initiateLogin(): Promise<void> {
    try {
      const response = await api.get<LoginResponse>('/auth/google/login');
      const { authorization_url } = response.data;

      // Redirect to Google OAuth
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Failed to initiate login:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback with code
   * Called after Google redirects back to app
   */
  async handleCallback(code: string, state: string): Promise<AuthResponse> {
    try {
      const response = await api.get<AuthResponse>('/auth/google/callback', {
        params: { code, state }
      });

      const { access_token, user } = response.data;

      // Store access token
      localStorage.setItem('access_token', access_token);

      return response.data;
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await api.post<{ access_token: string }>('/auth/refresh');
      const { access_token } = response.data;

      localStorage.setItem('access_token', access_token);
      return access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('access_token');
    } catch (error) {
      console.error('Failed to logout:', error);
      // Clear token anyway
      localStorage.removeItem('access_token');
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export default new AuthService();
