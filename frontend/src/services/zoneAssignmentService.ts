/**
 * Service for zone assignment operations (organizer-facing)
 */
import axios from 'axios';
import {
  ZoneAssignment,
  ZoneAssignmentWithZone,
  ZoneAssignmentCreateRequest,
  VolunteerInfo
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get authorization header
const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all assignments for a project
 */
export const getProjectAssignments = async (projectId: string): Promise<ZoneAssignment[]> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/projects/${projectId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Get all assignments for a specific zone
 */
export const getZoneAssignments = async (zoneId: string): Promise<ZoneAssignment[]> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/zones/${zoneId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Assign a volunteer to a zone
 */
export const assignVolunteer = async (
  projectId: string,
  data: ZoneAssignmentCreateRequest
): Promise<ZoneAssignment> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/assignments/projects/${projectId}`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Remove an assignment (unassign volunteer)
 */
export const removeAssignment = async (assignmentId: string): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/api/v1/assignments/${assignmentId}`,
    { headers: getAuthHeader() }
  );
};

/**
 * Get available volunteers for a project
 * @param projectId - The project ID
 * @param zoneId - Optional zone ID to filter out already-assigned volunteers
 */
export const getAvailableVolunteers = async (
  projectId: string,
  zoneId?: string
): Promise<VolunteerInfo[]> => {
  const params = zoneId ? { zone_id: zoneId } : {};
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/projects/${projectId}/available-volunteers`,
    {
      headers: getAuthHeader(),
      params
    }
  );
  return response.data;
};

/**
 * Get all assignments for the current user (volunteer)
 */
export const getVolunteerAssignments = async (): Promise<ZoneAssignmentWithZone[]> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/my-assignments`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Update assignment status (volunteer only)
 * @param assignmentId - The assignment ID
 * @param status - New status ('assigned', 'in_progress', or 'completed')
 */
export const updateAssignmentStatus = async (
  assignmentId: string,
  status: 'assigned' | 'in_progress' | 'completed'
): Promise<ZoneAssignment> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}/status`,
    { status },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Get specific assignment details for current user (volunteer)
 * @param assignmentId - The assignment ID
 */
export const getAssignmentDetail = async (assignmentId: string): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Update assignment notes and manual completion percentage (volunteer only)
 * @param assignmentId - The assignment ID
 * @param data - Object containing optional notes and manual_completion_percentage
 */
export const updateAssignment = async (
  assignmentId: string,
  data: { notes?: string; manual_completion_percentage?: number }
): Promise<ZoneAssignmentWithZone> => {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/assignments/my-assignments/${assignmentId}`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export default {
  getProjectAssignments,
  getZoneAssignments,
  assignVolunteer,
  removeAssignment,
  getAvailableVolunteers,
  getVolunteerAssignments,
  updateAssignmentStatus,
  getAssignmentDetail,
  updateAssignment
};
