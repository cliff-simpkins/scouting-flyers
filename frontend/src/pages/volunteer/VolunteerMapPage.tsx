/**
 * VolunteerMapPage - Read-only overview of assigned zones
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import zoneAssignmentService from '../../services/zoneAssignmentService';
import { ZoneAssignmentWithZone, Zone } from '../../types';
import VolunteerZoneMap from '../../components/volunteer/VolunteerZoneMap';
import './VolunteerMapPage.css';

const VolunteerMapPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleZoneClick = (zone: Zone) => {
    const assignment = assignments.find(a => a.zone_id === zone.id);
    if (assignment) {
      navigate(`/volunteer/zones/${assignment.id}`);
    }
  };

  return (
    <div className="volunteer-map-page">
      <div className="volunteer-map-page__header">
        <h2>My Zones</h2>
        <p>{assignments.length} {assignments.length === 1 ? 'zone' : 'zones'} assigned</p>
      </div>

      <div className="volunteer-map-page__content">
        {/* Zone Map - Read-only Overview */}
        <div className="volunteer-map-page__map">
          <VolunteerZoneMap
            zones={zones}
            onZoneClick={handleZoneClick}
          />
        </div>

        {/* Assignment list */}
        <div className="volunteer-map-page__assignments">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="volunteer-assignment-card"
              onClick={() => navigate(`/volunteer/zones/${assignment.id}`)}
              style={{ cursor: 'pointer' }}
            >
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
              <div className="volunteer-assignment-card__actions">
                <button
                  className="volunteer-assignment-card__btn volunteer-assignment-card__btn--view"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/volunteer/zones/${assignment.id}`);
                  }}
                >
                  View Details
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VolunteerMapPage;
