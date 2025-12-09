/**
 * ZoneItem component - displays zone with expandable volunteer list
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ZoneWithAssignments } from '../../types';
import zoneAssignmentService from '../../services/zoneAssignmentService';
import VolunteerAssignModal from './VolunteerAssignModal';
import ZoneMap from './ZoneMap';
import './ZoneItem.css';

interface ZoneItemProps {
  zone: ZoneWithAssignments;
  canEdit: boolean;
  projectId: string;
  onDelete: (zoneId: string, zoneName: string) => void;
  onAssignmentChange: () => void;
}

const ZoneItem: React.FC<ZoneItemProps> = ({
  zone,
  canEdit,
  projectId,
  onDelete,
  onAssignmentChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMapViewOpen, setIsMapViewOpen] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  const assignments = zone.assignments || [];
  const activeAssignments = assignments.filter(a => a.status !== 'completed');

  const handleRemoveAssignment = async (assignmentId: string, volunteerName: string) => {
    if (!window.confirm(`Remove ${volunteerName} from ${zone.name}?`)) {
      return;
    }

    setRemovingAssignmentId(assignmentId);
    try {
      await zoneAssignmentService.removeAssignment(assignmentId);
      onAssignmentChange();
    } catch (err) {
      console.error('Failed to remove assignment:', err);
      alert('Failed to remove volunteer assignment');
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'status-badge--assigned';
      case 'in_progress':
        return 'status-badge--in-progress';
      case 'completed':
        return 'status-badge--completed';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="zone-item">
        <div
          className="zone-item__header"
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
        >
          <div className="zone-item__info">
            <div className="zone-item__name-row">
              <span className="zone-item__name">{zone.name}</span>
              <span className="zone-item__volunteer-badge">
                {activeAssignments.length > 0
                  ? `${activeAssignments.length} ${activeAssignments.length === 1 ? 'volunteer' : 'volunteers'}`
                  : 'No volunteers'}
              </span>
            </div>
            {zone.description && (
              <div className="zone-item__description">{zone.description}</div>
            )}
          </div>
          <div className="zone-item__actions" onClick={(e) => e.stopPropagation()}>
            {zone.color && (
              <div
                className="zone-item__color"
                style={{ backgroundColor: zone.color }}
                title={`Color: ${zone.color}`}
              />
            )}
            <button
              className="zone-item__map-btn"
              onClick={() => setIsMapViewOpen(true)}
              title="View zone on map"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
              </svg>
            </button>
            {canEdit && (
              <button
                className="zone-item__delete-btn"
                onClick={() => onDelete(zone.id, zone.name)}
                title="Delete zone"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="zone-item__volunteers">
            {assignments.length === 0 ? (
              <div className="zone-item__no-volunteers">
                No volunteers assigned yet
              </div>
            ) : (
              <div className="volunteer-list">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="volunteer-item">
                    <div className="volunteer-item__info">
                      <div className="volunteer-item__name">
                        {assignment.volunteer_name || 'Unknown'}
                      </div>
                      <div className="volunteer-item__email">
                        {assignment.volunteer_email}
                      </div>
                      <div className="volunteer-item__date">
                        Assigned {formatDate(assignment.assigned_at)}
                      </div>
                    </div>
                    <div className="volunteer-item__actions">
                      <span className={`status-badge ${getStatusBadgeClass(assignment.status)}`}>
                        {getStatusLabel(assignment.status)}
                      </span>
                      {canEdit && assignment.status !== 'completed' && (
                        <button
                          className="volunteer-item__remove-btn"
                          onClick={() => handleRemoveAssignment(assignment.id, assignment.volunteer_name || 'volunteer')}
                          disabled={removingAssignmentId === assignment.id}
                          title="Remove volunteer"
                        >
                          {removingAssignmentId === assignment.id ? '...' : '×'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <button
                className="zone-item__add-volunteer-btn"
                onClick={() => setIsAssignModalOpen(true)}
              >
                + Assign Volunteer
              </button>
            )}
          </div>
        )}
      </div>

      {isAssignModalOpen && (
        <VolunteerAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={onAssignmentChange}
          projectId={projectId}
          zoneId={zone.id}
          zoneName={zone.name}
        />
      )}

      {isMapViewOpen && ReactDOM.createPortal(
        <div className="zone-map-modal">
          <div className="zone-map-modal__overlay" onClick={() => setIsMapViewOpen(false)} />
          <div className="zone-map-modal__content">
            <div className="zone-map-modal__header">
              <h3 className="zone-map-modal__title">{zone.name}</h3>
              <button
                className="zone-map-modal__close-btn"
                onClick={() => setIsMapViewOpen(false)}
                title="Close map view"
              >
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
              </button>
            </div>
            <div className="zone-map-modal__map">
              <ZoneMap zones={[zone]} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ZoneItem;
