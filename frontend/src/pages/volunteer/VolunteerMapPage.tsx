/**
 * VolunteerMapPage - Map view for volunteers to see their assigned zones
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import zoneAssignmentService from '../../services/zoneAssignmentService';
import completionService, { CompletionProgress } from '../../services/completionService';
import { ZoneAssignmentWithZone, Zone } from '../../types';
import VolunteerZoneMap from '../../components/volunteer/VolunteerZoneMap';
import './VolunteerMapPage.css';

// Component to display completion progress for an assignment
const AssignmentProgress: React.FC<{ assignmentId: string }> = ({ assignmentId }) => {
  const [progress, setProgress] = useState<CompletionProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
    // Refresh every 10 seconds while on the page
    const interval = setInterval(loadProgress, 10000);
    return () => clearInterval(interval);
  }, [assignmentId]);

  const loadProgress = async () => {
    try {
      const data = await completionService.getCompletionProgress(assignmentId);
      setProgress(data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !progress) {
    return null;
  }

  return (
    <div className="assignment-progress">
      <div className="assignment-progress__bar-container">
        <div
          className="assignment-progress__bar"
          style={{ width: `${progress.progress_percentage}%` }}
        />
      </div>
      <div className="assignment-progress__text">
        {progress.progress_percentage.toFixed(0)}% complete
        {progress.completion_count > 0 && (
          <span className="assignment-progress__count">
            {' '}• {progress.completion_count} {progress.completion_count === 1 ? 'area' : 'areas'} marked
          </span>
        )}
      </div>
    </div>
  );
};

const VolunteerMapPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ZoneAssignmentWithZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      // Fetch assignments for the current volunteer
      const data = await zoneAssignmentService.getVolunteerAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError('Failed to load your zone assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (assignmentId: string, newStatus: 'in_progress' | 'completed') => {
    try {
      await zoneAssignmentService.updateAssignmentStatus(assignmentId, newStatus);
      // Reload assignments to reflect the change
      await loadAssignments();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update assignment status');
    }
  };

  if (loading) {
    return (
      <div className="volunteer-map-page">
        <div className="volunteer-map-page__loading">Loading your assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="volunteer-map-page">
        <div className="volunteer-map-page__error">{error}</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="volunteer-map-page">
        <div className="volunteer-map-page__empty">
          <h2>No Zone Assignments</h2>
          <p>You don't have any zone assignments yet. Please contact your organizer.</p>
        </div>
      </div>
    );
  }

  // Convert assignments to zones format for the map
  const zones: Zone[] = assignments.map((assignment) => ({
    id: assignment.zone_id,
    name: assignment.zone_name,
    description: `${assignment.project_name} - ${assignment.status.replace('_', ' ')}`,
    geometry: assignment.zone_geometry,
    color: assignment.zone_color,
    project_id: assignment.project_id,
  }));

  // For completion tracking, use the first incomplete assignment
  // TODO: Allow selecting which assignment to track when there are multiple
  const activeAssignment = assignments.find(a => a.status !== 'completed') || assignments[0];

  return (
    <div className="volunteer-map-page">
      <div className="volunteer-map-page__header">
        <h2>My Zones</h2>
        <p>{assignments.length} {assignments.length === 1 ? 'zone' : 'zones'} assigned</p>
        {assignments.length > 1 && activeAssignment && (
          <p className="volunteer-map-page__active-zone">
            Marking for: <strong>{activeAssignment.zone_name}</strong>
          </p>
        )}
      </div>

      <div className="volunteer-map-page__content">
        {/* Zone Map with Geolocation and Completion Tracking */}
        <div className="volunteer-map-page__map">
          <VolunteerZoneMap
            zones={zones}
            assignmentId={activeAssignment?.id}
          />
        </div>

        {/* Assignment list */}
        <div className="volunteer-map-page__assignments">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="volunteer-assignment-card">
              <div className="volunteer-assignment-card__header">
                <h3>{assignment.zone_name}</h3>
                <span className={`status-badge status-badge--${assignment.status}`}>
                  {assignment.status.replace('_', ' ')}
                </span>
              </div>
              <div className="volunteer-assignment-card__info">
                <p>Project: {assignment.project_name}</p>
                <p>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</p>
                {assignment.started_at && (
                  <p>Started: {new Date(assignment.started_at).toLocaleDateString()}</p>
                )}
                {assignment.completed_at && (
                  <p>Completed: {new Date(assignment.completed_at).toLocaleDateString()}</p>
                )}
              </div>
              {assignment.status !== 'assigned' && (
                <AssignmentProgress assignmentId={assignment.id} />
              )}
              <div className="volunteer-assignment-card__actions">
                {assignment.status === 'assigned' && (
                  <button
                    className="volunteer-assignment-card__btn volunteer-assignment-card__btn--start"
                    onClick={() => handleStatusUpdate(assignment.id, 'in_progress')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Start Work
                  </button>
                )}
                {assignment.status === 'in_progress' && (
                  <button
                    className="volunteer-assignment-card__btn volunteer-assignment-card__btn--complete"
                    onClick={() => handleStatusUpdate(assignment.id, 'completed')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Mark Complete
                  </button>
                )}
                {assignment.status === 'completed' && (
                  <div className="volunteer-assignment-card__completed">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="16 8 10 14 8 12"/>
                    </svg>
                    <span>Work completed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VolunteerMapPage;
