/**
 * Project card component for displaying project summary
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { Project } from '../../types';
import './ProjectCard.css';

interface ProjectCardProps {
  project: Project;
  currentUserId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  currentUserId,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const isOwner = project.owner_id === currentUserId;

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Are you sure you want to delete this project?')) {
      onDelete();
    }
  };

  return (
    <Card className="project-card">
      <div className="project-card__header" onClick={handleCardClick}>
        <h3 className="project-card__name">{project.name}</h3>
        <div className="project-card__badges">
          {isOwner && <span className="project-card__badge project-card__badge--owner">Owner</span>}
          <span
            className={`project-card__badge ${
              project.is_active ? 'project-card__badge--active' : 'project-card__badge--inactive'
            }`}
          >
            {project.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="project-card__body" onClick={handleCardClick}>
        {project.description ? (
          <p className="project-card__description">
            {project.description.length > 100
              ? `${project.description.substring(0, 100)}...`
              : project.description}
          </p>
        ) : (
          <p className="project-card__description project-card__description--empty">
            No description
          </p>
        )}

        <p className="project-card__date">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {isOwner && (
        <div className="project-card__actions">
          <Button variant="secondary" onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ProjectCard;
