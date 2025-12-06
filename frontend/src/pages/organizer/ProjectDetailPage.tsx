/**
 * Project detail page with collaborators management
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectFormModal from '../../components/organizer/ProjectFormModal';
import CollaboratorInviteModal from '../../components/organizer/CollaboratorInviteModal';
import ZoneImportModal from '../../components/organizer/ZoneImportModal';
import ZoneMap from '../../components/organizer/ZoneMap';
import projectService from '../../services/projectService';
import zoneService, { Zone } from '../../services/zoneService';
import { ProjectWithCollaborators, CollaboratorRole } from '../../types';
import './ProjectDetailPage.css';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectWithCollaborators | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isZoneImportModalOpen, setIsZoneImportModalOpen] = useState(false);

  const loadProject = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProject(id);
      setProject(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    if (!id) return;

    try {
      setLoadingZones(true);
      const data = await zoneService.getProjectZones(id);
      // Sort zones alphabetically by name
      const sortedZones = data.sort((a, b) => a.name.localeCompare(b.name));
      setZones(sortedZones);
    } catch (err: any) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoadingZones(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadZones();
  }, [id]);

  const handleZoneImportSuccess = () => {
    loadZones();
  };

  const isOwner = project && user && project.owner_id === user.id;
  const userCollaborator = project?.collaborators.find(
    (collab) => collab.user_id === user?.id
  );
  const canEdit =
    isOwner ||
    (userCollaborator &&
      (userCollaborator.role === CollaboratorRole.ORGANIZER ||
        userCollaborator.role === CollaboratorRole.OWNER));

  const handleRemoveCollaborator = async (userId: string) => {
    if (!id || !window.confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      await projectService.removeCollaborator(id, userId);
      await loadProject();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove collaborator');
    }
  };

  const handleDeleteZone = async (zoneId: string, zoneName: string) => {
    if (!window.confirm(`Are you sure you want to delete the zone "${zoneName}"?`)) {
      return;
    }

    try {
      await zoneService.deleteZone(zoneId);
      await loadZones();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete zone');
    }
  };

  const handleDeleteAllZones = async () => {
    if (!id) return;

    if (!window.confirm(`Are you sure you want to delete ALL ${zones.length} zone(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await zoneService.deleteAllZones(id);
      alert(result.message);
      await loadZones();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete zones');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !project) {
    return (
      <div className="project-detail-page">
        <div className="project-detail-page__error">
          {error || 'Project not found'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="project-detail-page__header">
        <Button
          variant="secondary"
          onClick={() => navigate('/projects')}
          className="project-detail-page__back-button"
        >
          ← Back
        </Button>
        <div className="project-detail-page__header-content">
          <div>
            <h1 className="project-detail-page__title">{project.name}</h1>
            <div className="project-detail-page__badges">
              {isOwner && (
                <span className="project-detail-page__badge project-detail-page__badge--owner">
                  Owner
                </span>
              )}
              <span
                className={`project-detail-page__badge ${
                  project.is_active
                    ? 'project-detail-page__badge--active'
                    : 'project-detail-page__badge--inactive'
                }`}
              >
                {project.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {canEdit && (
            <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
              Edit Project
            </Button>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="project-detail-page__section">
        <h2 className="project-detail-page__section-title">Description</h2>
        <p className="project-detail-page__description">
          {project.description || 'No description provided.'}
        </p>
      </div>

      {/* Collaborators Section */}
      <div className="project-detail-page__section">
        <div className="project-detail-page__section-header">
          <h2 className="project-detail-page__section-title">
            Collaborators ({project.collaborators.length})
          </h2>
          {canEdit && (
            <Button variant="primary" onClick={() => setIsInviteModalOpen(true)}>
              + Invite
            </Button>
          )}
        </div>

        {project.collaborators.length === 0 ? (
          <p className="project-detail-page__empty">No collaborators yet.</p>
        ) : (
          <div className="project-detail-page__collaborators">
            {project.collaborators.map((collaborator) => (
              <div key={collaborator.id} className="collaborator-item">
                <div className="collaborator-item__info">
                  <div className="collaborator-item__name">
                    {collaborator.user_name || 'Unknown User'}
                  </div>
                  <div className="collaborator-item__email">
                    {collaborator.user_email}
                  </div>
                </div>
                <div className="collaborator-item__role">
                  <span
                    className={`collaborator-item__role-badge collaborator-item__role-badge--${collaborator.role}`}
                  >
                    {collaborator.role}
                  </span>
                  {canEdit && collaborator.user_id !== project.owner_id && (
                    <Button
                      variant="danger"
                      onClick={() => handleRemoveCollaborator(collaborator.user_id)}
                      className="collaborator-item__remove-button"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zones Section */}
      <div className="project-detail-page__section">
        <div className="project-detail-page__section-header">
          <h2 className="project-detail-page__section-title">
            Zones ({zones.length})
          </h2>
          {canEdit && (
            <div className="project-detail-page__zone-actions">
              <Button variant="primary" onClick={() => setIsZoneImportModalOpen(true)}>
                Import from KML
              </Button>
              {zones.length > 0 && (
                <Button variant="danger" onClick={handleDeleteAllZones}>
                  Delete All Zones
                </Button>
              )}
            </div>
          )}
        </div>

        {loadingZones ? (
          <LoadingSpinner />
        ) : zones.length === 0 ? (
          <div className="project-detail-page__empty">
            <p>No zones yet. Import zones from a KML file to get started.</p>
            {canEdit && (
              <Button variant="primary" onClick={() => setIsZoneImportModalOpen(true)}>
                Import Zones
              </Button>
            )}
          </div>
        ) : (
          <div className="project-detail-page__zones">
            <ZoneMap zones={zones} />
            <div className="project-detail-page__zone-list">
              {zones.map((zone) => (
                <div key={zone.id} className="zone-item">
                  <div className="zone-item__info">
                    <div className="zone-item__name">{zone.name}</div>
                    {zone.description && (
                      <div className="zone-item__description">{zone.description}</div>
                    )}
                  </div>
                  <div className="zone-item__actions">
                    {zone.color && (
                      <div
                        className="zone-item__color"
                        style={{ backgroundColor: zone.color }}
                      />
                    )}
                    {canEdit && (
                      <button
                        className="zone-item__delete-btn"
                        onClick={() => handleDeleteZone(zone.id, zone.name)}
                        title="Delete zone"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <ProjectFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={loadProject}
          project={project}
          mode="edit"
        />
      )}

      {/* Invite Collaborator Modal */}
      <CollaboratorInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={loadProject}
        projectId={project.id}
      />

      {/* Zone Import Modal */}
      <ZoneImportModal
        isOpen={isZoneImportModalOpen}
        onClose={() => setIsZoneImportModalOpen(false)}
        onSuccess={handleZoneImportSuccess}
        projectId={project.id}
        existingZones={zones}
      />
    </div>
  );
};

export default ProjectDetailPage;
