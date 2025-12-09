/**
 * Modal for assigning volunteers to zones
 */
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Select from '../common/Select';
import Button from '../common/Button';
import { VolunteerInfo, ZoneAssignmentCreateRequest } from '../../types';
import zoneAssignmentService from '../../services/zoneAssignmentService';
import './VolunteerAssignModal.css';

interface VolunteerAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  zoneId: string;
  zoneName: string;
}

const VolunteerAssignModal: React.FC<VolunteerAssignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  zoneId,
  zoneName,
}) => {
  const [volunteerId, setVolunteerId] = useState('');
  const [availableVolunteers, setAvailableVolunteers] = useState<VolunteerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVolunteerId('');
      setError(null);
      loadAvailableVolunteers();
    }
  }, [isOpen, zoneId]);

  const loadAvailableVolunteers = async () => {
    setLoadingVolunteers(true);
    try {
      // Get volunteers not already assigned to this zone
      const volunteers = await zoneAssignmentService.getAvailableVolunteers(projectId, zoneId);
      setAvailableVolunteers(volunteers);

      // Auto-select first volunteer if only one available
      if (volunteers.length === 1) {
        setVolunteerId(volunteers[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load volunteers:', err);
      setError('Failed to load available volunteers');
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!volunteerId) {
      setError('Please select a volunteer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: ZoneAssignmentCreateRequest = {
        zone_id: zoneId,
        volunteer_id: volunteerId,
      };

      await zoneAssignmentService.assignVolunteer(projectId, data);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to assign volunteer:', err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to assign volunteer. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const volunteerOptions = availableVolunteers.map((v) => ({
    value: v.id,
    label: `${v.name} (${v.email})${v.current_assignments_count > 0 ? ` - ${v.current_assignments_count} active` : ''}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Volunteer to ${zoneName}`}>
      <form onSubmit={handleSubmit} className="volunteer-assign-form">
        {loadingVolunteers ? (
          <div className="volunteer-assign-form__loading">
            Loading available volunteers...
          </div>
        ) : availableVolunteers.length === 0 ? (
          <div className="volunteer-assign-form__no-volunteers">
            <p>No available volunteers to assign.</p>
            <p className="volunteer-assign-form__hint">
              All project collaborators are already assigned to this zone,
              or there are no collaborators yet.
            </p>
          </div>
        ) : (
          <>
            <div className="volunteer-assign-form__field">
              <Select
                label="Select Volunteer"
                value={volunteerId}
                onChange={(e) => setVolunteerId(e.target.value)}
                options={volunteerOptions}
                required
                disabled={loading}
              />
              <p className="volunteer-assign-form__hint">
                Choose a volunteer to assign to this zone
              </p>
            </div>

            {error && (
              <div className="volunteer-assign-form__error">
                {error}
              </div>
            )}

            <div className="volunteer-assign-form__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!volunteerId || loading}
              >
                {loading ? 'Assigning...' : 'Assign Volunteer'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default VolunteerAssignModal;
