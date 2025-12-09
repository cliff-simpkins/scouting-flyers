/**
 * Service for assignment operations (volunteer-facing)
 */
import axios from 'axios';
import { ZoneAssignmentWithZone } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all assignments for the current volunteer
 * @param projectId - Optional project ID to filter assignments
 */
export const getMyAssignments = async (projectId?: string): Promise<ZoneAssignmentWithZone[]> => {
  const params = projectId ? { project_id: projectId } : {};
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/my-assignments`,
    {
      headers: getAuthHeader(),
      params
    }
  );
  return response.data;
};

/**
 * Get specific assignment details for current volunteer
 */
export const getMyAssignment = async (assignmentId: string): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Start an assignment (mark as in_progress)
 */
export const startAssignment = async (assignmentId: string): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}/status`,
    { status: 'in_progress' },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Complete an assignment (mark as completed)
 */
export const completeAssignment = async (assignmentId: string): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}/status`,
    { status: 'completed' },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Update assignment status
 */
export const updateAssignmentStatus = async (
  assignmentId: string,
  status: 'in_progress' | 'completed'
): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}/status`,
    { status },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export default {
  getMyAssignments,
  getMyAssignment,
  startAssignment,
  completeAssignment,
  updateAssignmentStatus
};
