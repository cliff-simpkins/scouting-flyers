/**
 * Modal for creating and editing projects
 */
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { Project, ProjectCreateRequest, ProjectUpdateRequest } from '../../types';
import projectService from '../../services/projectService';
import './ProjectFormModal.css';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project?: Project;
  mode: 'create' | 'edit';
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  project,
  mode,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && project) {
      setName(project.name);
      setDescription(project.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError(null);
    setNameError(null);
  }, [isOpen, mode, project]);

  const validateForm = (): boolean => {
    setNameError(null);

    if (!name.trim()) {
      setNameError('Project name is required');
      return false;
    }

    if (name.length > 255) {
      setNameError('Project name must be 255 characters or less');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const data: ProjectCreateRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
        };
        await projectService.createProject(data);
      } else if (mode === 'edit' && project) {
        const data: ProjectUpdateRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
        };
        await projectService.updateProject(project.id, data);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Project' : 'Edit Project'}
    >
      <form onSubmit={handleSubmit} className="project-form">
        {error && <div className="project-form__error">{error}</div>}

        <Input
          label="Project Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError || undefined}
          required
          placeholder="Enter project name"
          maxLength={255}
        />

        <div className="input-group">
          <label htmlFor="description" className="input-group__label">
            Description
          </label>
          <textarea
            id="description"
            className="project-form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter project description (optional)"
            rows={4}
          />
        </div>

        <div className="project-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {mode === 'create' ? 'Create Project' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectFormModal;
