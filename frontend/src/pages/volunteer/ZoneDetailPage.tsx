/**
 * ZoneDetailPage - Detailed view for a single zone assignment with marking capability
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import zoneAssignmentService from '../../services/zoneAssignmentService';
import completionService, { CompletionProgress } from '../../services/completionService';
import { getAssignmentNotes, createAssignmentNote, updateAssignmentNote, deleteAssignmentNote } from '../../services/assignmentNoteService';
import { ZoneAssignmentWithZone, Zone, AssignmentNote } from '../../types';
import VolunteerZoneMap from '../../components/volunteer/VolunteerZoneMap';
import './ZoneDetailPage.css';

const ZoneDetailPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<ZoneAssignmentWithZone | null>(null);
  const [progress, setProgress] = useState<CompletionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes list state
  const [notesList, setNotesList] = useState<AssignmentNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Local editing state
  const [manualPercentage, setManualPercentage] = useState<number | null>(null);
  const [isSavingPercentage, setIsSavingPercentage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      loadAssignmentDetails();
      loadProgress();
      loadNotes();
    }
  }, [assignmentId]);

  const loadAssignmentDetails = async () => {
    if (!assignmentId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await zoneAssignmentService.getAssignmentDetail(assignmentId);
      setAssignment(data);
      setManualPercentage(data.manual_completion_percentage ?? null);
    } catch (err) {
      console.error('Failed to load assignment details:', err);
      setError('Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!assignmentId) return;

    try {
      const data = await completionService.getCompletionProgress(assignmentId);
      setProgress(data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  };

  const loadNotes = async () => {
    if (!assignmentId) return;

    try {
      const notes = await getAssignmentNotes(assignmentId);
      setNotesList(notes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleAddNote = async () => {
    if (!assignmentId || !newNoteContent.trim()) return;

    try {
      const newNote = await createAssignmentNote(assignmentId, newNoteContent);
      setNotesList([newNote, ...notesList]);
      setNewNoteContent('');
    } catch (err) {
      console.error('Failed to create note:', err);
      alert('Failed to create note: ' + (err as Error).message);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editingContent.trim()) return;

    try {
      const updated = await updateAssignmentNote(noteId, editingContent);
      setNotesList(notesList.map(n => n.id === noteId ? updated : n));
      setEditingNoteId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to update note:', err);
      alert('Failed to update note: ' + (err as Error).message);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteAssignmentNote(noteId);
      setNotesList(notesList.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('Failed to delete note: ' + (err as Error).message);
    }
  };

  const startEditingNote = (note: AssignmentNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleSavePercentage = async () => {
    if (!assignmentId) return;

    try {
      setIsSavingPercentage(true);
      const updated = await zoneAssignmentService.updateAssignment(assignmentId, {
        manual_completion_percentage: manualPercentage ?? undefined
      });
      setAssignment(updated);
    } catch (err) {
      console.error('Failed to save percentage:', err);
      alert('Failed to save percentage: ' + (err as Error).message);
    } finally {
      setIsSavingPercentage(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'assigned' | 'in_progress' | 'completed') => {
    if (!assignmentId) return;

    try {
      setIsUpdatingStatus(true);
      await zoneAssignmentService.updateAssignmentStatus(assignmentId, newStatus);
      await loadAssignmentDetails(); // Reload to get updated status
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status: ' + (err as Error).message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="zone-detail-page">
        <div className="zone-detail-page__loading">Loading zone details...</div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="zone-detail-page">
        <div className="zone-detail-page__error">{error || 'Assignment not found'}</div>
        <button
          className="zone-detail-page__back-btn"
          onClick={() => navigate('/volunteer/zones')}
        >
          ← Back to My Zones
        </button>
      </div>
    );
  }

  // Convert assignment to zone format for the map
  const zone: Zone = {
    id: assignment.zone_id,
    name: assignment.zone_name,
    description: assignment.project_name,
    geometry: assignment.zone_geometry,
    color: assignment.zone_color,
    project_id: assignment.project_id,
  };

  // Check if view-only mode
  const isCompleted = assignment.status === 'completed';

  // Calculate displayed percentage (manual override or auto-calculated)
  const displayedPercentage = assignment.manual_completion_percentage ??
                              progress?.progress_percentage ?? 0;

  return (
    <div className="zone-detail-page">
      {/* Header */}
      <div className="zone-detail-page__header">
        <button
          className="zone-detail-page__back-btn"
          onClick={() => navigate('/volunteer/zones')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to My Zones
        </button>
        <div className="zone-detail-page__title-section">
          <h1>{assignment.zone_name}</h1>
          <p className="zone-detail-page__subtitle">{assignment.project_name}</p>
        </div>
        <div className="zone-detail-page__status">
          <span className={`zone-detail-page__status-badge zone-detail-page__status-badge--${assignment.status}`}>
            {assignment.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="zone-detail-page__content">
        {/* Left: Map */}
        <div className="zone-detail-page__map-section">
          <VolunteerZoneMap
            zones={[zone]}
            assignmentId={assignmentId}
            readOnly={isCompleted}
          />
        </div>

        {/* Right: Details Panel */}
        <div className="zone-detail-page__details-panel">
          {/* Assignment Info */}
          <div className="zone-detail-page__card">
            <h3>Assignment Information</h3>
            <div className="zone-detail-page__info-grid">
              <div className="zone-detail-page__info-item">
                <span className="zone-detail-page__info-label">Created:</span>
                <span className="zone-detail-page__info-value">
                  {new Date(assignment.assigned_at).toLocaleDateString()}
                  {assignment.assigned_by_name && (
                    <span className="zone-detail-page__info-by"> by {assignment.assigned_by_name}</span>
                  )}
                </span>
              </div>
              {assignment.started_at && (
                <div className="zone-detail-page__info-item">
                  <span className="zone-detail-page__info-label">Started:</span>
                  <span className="zone-detail-page__info-value">
                    {new Date(assignment.started_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {assignment.completed_at && (
                <div className="zone-detail-page__info-item">
                  <span className="zone-detail-page__info-label">Completed:</span>
                  <span className="zone-detail-page__info-value">
                    {new Date(assignment.completed_at).toLocaleDateString()}
                    <span className="zone-detail-page__info-by"> by you</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="zone-detail-page__card">
            <h3>Completion Progress</h3>

            <div className="zone-detail-page__progress-info">
              <div className="zone-detail-page__progress-label">
                {displayedPercentage.toFixed(1)}%
                {assignment.manual_completion_percentage !== null && assignment.manual_completion_percentage !== undefined && (
                  <span className="zone-detail-page__progress-label-note"> (manually set)</span>
                )}
              </div>
              <div className="zone-detail-page__progress-bar">
                <div
                  className="zone-detail-page__progress-fill"
                  style={{ width: `${displayedPercentage}%` }}
                />
              </div>
              {progress && (
                <div className="zone-detail-page__progress-details">
                  {progress.completion_count} areas marked
                </div>
              )}
            </div>

            {/* Update completion percentage */}
            <div className="zone-detail-page__manual-percentage">
              <label htmlFor="manual-percentage">Update Completion %:</label>
              <div className="zone-detail-page__percentage-input-group">
                <input
                  id="manual-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={manualPercentage ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    setManualPercentage(val);
                  }}
                  placeholder="Not set"
                  className="zone-detail-page__percentage-input"
                  disabled={isCompleted}
                />
                <button
                  onClick={handleSavePercentage}
                  disabled={isSavingPercentage || isCompleted}
                  className="zone-detail-page__save-btn"
                >
                  {isSavingPercentage ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="zone-detail-page__help-text">
                Set this to manually override the auto-calculated percentage
              </p>
            </div>
          </div>

          {/* Other Volunteers Section */}
          {assignment.other_volunteers && assignment.other_volunteers.length > 0 && (
            <div className="zone-detail-page__card">
              <h3>Other Volunteers on this Zone</h3>
              <div className="zone-detail-page__other-volunteers">
                {assignment.other_volunteers.map((vol) => (
                  <div key={vol.id} className="zone-detail-page__volunteer-item">
                    <div className="zone-detail-page__volunteer-avatar">
                      {vol.volunteer_picture_url ? (
                        <img src={vol.volunteer_picture_url} alt={vol.volunteer_name || 'Volunteer'} />
                      ) : (
                        <div className="zone-detail-page__volunteer-initials">
                          {(vol.volunteer_name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="zone-detail-page__volunteer-info">
                      <div className="zone-detail-page__volunteer-name">{vol.volunteer_name}</div>
                      <div className="zone-detail-page__volunteer-status">
                        <span className={`zone-detail-page__status-badge zone-detail-page__status-badge--${vol.status}`}>
                          {vol.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="zone-detail-page__card">
            <h3>Zone Notes</h3>

            {/* Notes list */}
            <div className="zone-detail-page__notes-list">
              {notesList.length === 0 ? (
                <p className="zone-detail-page__no-notes">No notes yet. Add your first note below.</p>
              ) : (
                notesList.map((note) => (
                  <div key={note.id} className="zone-detail-page__note-item">
                    <div className="zone-detail-page__note-header">
                      <div className="zone-detail-page__note-author">
                        {note.author_picture_url ? (
                          <img src={note.author_picture_url} alt={note.author_name || 'Author'} className="zone-detail-page__note-avatar" />
                        ) : (
                          <div className="zone-detail-page__note-avatar zone-detail-page__note-avatar--initials">
                            {(note.author_name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="zone-detail-page__note-author-name">{note.author_name}</div>
                          <div className="zone-detail-page__note-timestamp">
                            {new Date(note.created_at).toLocaleString()}
                            {note.updated_at !== note.created_at && ' (edited)'}
                          </div>
                        </div>
                      </div>
                      <div className="zone-detail-page__note-actions">
                        <button
                          onClick={() => startEditingNote(note)}
                          className="zone-detail-page__note-action-btn"
                          title="Edit note"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="zone-detail-page__note-action-btn zone-detail-page__note-action-btn--delete"
                          title="Delete note"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="zone-detail-page__note-content">
                      {editingNoteId === note.id ? (
                        <div className="zone-detail-page__note-edit">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="zone-detail-page__note-edit-textarea"
                            rows={4}
                          />
                          <div className="zone-detail-page__note-edit-actions">
                            <button
                              onClick={() => handleEditNote(note.id)}
                              className="zone-detail-page__save-btn"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditingNote}
                              className="zone-detail-page__cancel-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>{note.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new note */}
            {!isCompleted && (
              <div className="zone-detail-page__add-note">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add a new note..."
                  className="zone-detail-page__add-note-textarea"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim()}
                  className="zone-detail-page__add-note-btn"
                >
                  Add Note
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="zone-detail-page__card">
            <h3>Actions</h3>
            <div className="zone-detail-page__actions">
              {assignment.status === 'assigned' && (
                <button
                  onClick={() => handleStatusUpdate('in_progress')}
                  disabled={isUpdatingStatus}
                  className="zone-detail-page__action-btn zone-detail-page__action-btn--start"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Work on Zone
                </button>
              )}
              {assignment.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('assigned')}
                    disabled={isUpdatingStatus}
                    className="zone-detail-page__action-btn zone-detail-page__action-btn--reset"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Reset to Not Started
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={isUpdatingStatus}
                    className="zone-detail-page__action-btn zone-detail-page__action-btn--complete"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Mark as Complete
                  </button>
                </>
              )}
              {assignment.status === 'completed' && (
                <div className="zone-detail-page__completed-section">
                  <div className="zone-detail-page__completed-message">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="8 12 11 15 16 10"/>
                    </svg>
                    <span>This zone has been marked as complete!</span>
                  </div>
                  <button
                    onClick={() => handleStatusUpdate('in_progress')}
                    disabled={isUpdatingStatus}
                    className="zone-detail-page__action-btn zone-detail-page__action-btn--reactivate"
                    title="Reactivate this zone to continue working on it"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Reactivate Zone
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneDetailPage;
