/**
 * Project list page with search and create functionality
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ProjectCard from '../../components/organizer/ProjectCard';
import ProjectFormModal from '../../components/organizer/ProjectFormModal';
import projectService from '../../services/projectService';
import { Project } from '../../types';
import './ProjectListPage.css';

const ProjectListPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = projects.filter((project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [searchTerm, projects]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleDelete = async (project: Project) => {
    try {
      await projectService.deleteProject(project.id);
      await loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const handleModalSuccess = async () => {
    await loadProjects();
    setEditingProject(null);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingProject(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="project-list-page">
        <div className="project-list-page__error">{error}</div>
      </div>
    );
  }

  return (
    <div className="project-list-page">
      <div className="project-list-page__header">
        <h1 className="project-list-page__title">My Projects</h1>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + New Project
        </Button>
      </div>

      <div className="project-list-page__search">
        <input
          type="text"
          className="project-list-page__search-input"
          placeholder="Search projects by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProjects.length === 0 ? (
        projects.length === 0 ? (
          <EmptyState
            message="You don't have any projects yet. Create one to get started!"
            action={{
              label: 'Create Project',
              onClick: () => setIsCreateModalOpen(true),
            }}
          />
        ) : (
          <EmptyState message="No projects match your search." />
        )
      ) : (
        <div className="project-list-page__grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={user?.id || ''}
              onEdit={() => handleEdit(project)}
              onDelete={() => handleDelete(project)}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        mode="create"
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectFormModal
          isOpen={true}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          project={editingProject}
          mode="edit"
        />
      )}
    </div>
  );
};

export default ProjectListPage;
