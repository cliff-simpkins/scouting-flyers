/**
 * Service for completion tracking operations
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface CompletionArea {
  id: string;
  assignment_id: string;
  geometry: any; // GeoJSON geometry
  completed_at: string;
  notes?: string;
}

export interface CompletionProgress {
  assignment_id: string;
  total_area_sqm: number;
  completed_area_sqm: number;
  progress_percentage: number;
  completion_count: number;
}

/**
 * Mark an area as completed
 */
export const createCompletionArea = async (
  assignmentId: string,
  geometry: any,
  notes?: string
): Promise<CompletionArea> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/completions/assignments/${assignmentId}/areas`,
    { geometry, notes },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Get all completion areas for an assignment
 */
export const getCompletionAreas = async (assignmentId: string): Promise<CompletionArea[]> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/completions/assignments/${assignmentId}/areas`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Delete a completion area (undo marking)
 */
export const deleteCompletionArea = async (areaId: string): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/api/v1/completions/areas/${areaId}`,
    { headers: getAuthHeader() }
  );
};

/**
 * Get completion progress for an assignment
 */
export const getCompletionProgress = async (assignmentId: string): Promise<CompletionProgress> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/completions/assignments/${assignmentId}/progress`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export default {
  createCompletionArea,
  getCompletionAreas,
  deleteCompletionArea,
  getCompletionProgress
};
