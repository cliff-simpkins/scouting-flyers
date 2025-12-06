/**
 * Modal for inviting collaborators to a project
 */
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { CollaboratorRole, CollaboratorInviteRequest } from '../../types';
import projectService from '../../services/projectService';
import './CollaboratorInviteModal.css';

interface CollaboratorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

const CollaboratorInviteModal: React.FC<CollaboratorInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>(CollaboratorRole.VIEWER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole(CollaboratorRole.VIEWER);
      setError(null);
      setErrorDetails(null);
      setShowErrorDetails(false);
      setEmailError(null);
    }
  }, [isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    setEmailError(null);

    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data: CollaboratorInviteRequest = {
        email: email.trim(),
        role,
      };
      await projectService.inviteCollaborator(projectId, data);
      onSuccess();
      onClose();
    } catch (err: any) {
      // Extract user-friendly error message
      const backendDetail = err.response?.data?.detail;
      let userMessage = 'Failed to invite collaborator';

      if (backendDetail) {
        if (backendDetail.includes('not found')) {
          userMessage = `User with email "${email}" not found. They need to register first before being invited.`;
        } else if (backendDetail.includes('already a collaborator')) {
          userMessage = 'This user is already a collaborator on this project.';
        } else if (backendDetail.includes('Cannot add owner')) {
          userMessage = 'Cannot add the project owner as a collaborator.';
        } else {
          userMessage = backendDetail;
        }
      }

      setError(userMessage);

      // Store full error details for debugging
      setErrorDetails({
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        detail: err.response?.data?.detail,
        fullResponse: err.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: CollaboratorRole.VIEWER, label: 'Viewer' },
    { value: CollaboratorRole.ORGANIZER, label: 'Organizer' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Collaborator">
      <form onSubmit={handleSubmit} className="collaborator-invite-form">
        {error && (
          <div className="collaborator-invite-form__error">
            <div className="collaborator-invite-form__error-message">{error}</div>
            {errorDetails && (
              <div className="collaborator-invite-form__error-details">
                <button
                  type="button"
                  className="collaborator-invite-form__error-toggle"
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                >
                  {showErrorDetails ? '▼' : '▶'} Technical Details
                </button>
                {showErrorDetails && (
                  <pre className="collaborator-invite-form__error-code">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError || undefined}
          required
          placeholder="colleague@example.com"
        />

        <Select
          label="Role"
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as CollaboratorRole)}
          required
        />

        <div className="collaborator-invite-form__role-descriptions">
          <p className="collaborator-invite-form__role-description">
            <strong>Viewer:</strong> Can view project data but cannot make changes.
          </p>
          <p className="collaborator-invite-form__role-description">
            <strong>Organizer:</strong> Can edit project details and manage collaborators.
          </p>
        </div>

        <div className="collaborator-invite-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CollaboratorInviteModal;
