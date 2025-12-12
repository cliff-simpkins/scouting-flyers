/**
 * Assignment Note Service
 * Handles CRUD operations for assignment notes
 */

import axios from 'axios';
import { AssignmentNote } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const API_V1_PREFIX = '/api/v1';

/**
 * Get all notes for an assignment
 */
export const getAssignmentNotes = async (assignmentId: string): Promise<AssignmentNote[]> => {
  const token = localStorage.getItem('access_token');

  const response = await axios.get(
    `${API_BASE_URL}${API_V1_PREFIX}/assignment-notes/assignments/${assignmentId}/notes`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Create a new note for an assignment
 */
export const createAssignmentNote = async (
  assignmentId: string,
  content: string
): Promise<AssignmentNote> => {
  const token = localStorage.getItem('access_token');

  const response = await axios.post(
    `${API_BASE_URL}${API_V1_PREFIX}/assignment-notes/assignments/${assignmentId}/notes`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Update an existing note
 */
export const updateAssignmentNote = async (
  noteId: string,
  content: string
): Promise<AssignmentNote> => {
  const token = localStorage.getItem('access_token');

  const response = await axios.patch(
    `${API_BASE_URL}${API_V1_PREFIX}/assignment-notes/notes/${noteId}`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Delete a note
 */
export const deleteAssignmentNote = async (noteId: string): Promise<void> => {
  const token = localStorage.getItem('access_token');

  await axios.delete(
    `${API_BASE_URL}${API_V1_PREFIX}/assignment-notes/notes/${noteId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};
