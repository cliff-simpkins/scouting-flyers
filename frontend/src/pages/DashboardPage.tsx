/**
 * DashboardPage - Unified landing page showing managed projects and zone assignments
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import projectService from '../services/projectService';
import zoneAssignmentService from '../services/zoneAssignmentService';
import { Project, ZoneAssignmentWithZone, ProjectStatus, CollaboratorRole } from '../types';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [managedProjects, setManagedProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignmentWithZone[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadManagedProjects();
    loadAssignments();
  }, []);

  const loadManagedProjects = async () => {
    try {
      setProjectsLoading(true);
      const projects = await projectService.getProjects();
      setManagedProjects(projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load managed projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const data = await zoneAssignmentService.getVolunteerAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      // Don't set error here - assignments might be empty for organizers
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'dashboard__status-badge--completed';
      case 'in_progress':
        return 'dashboard__status-badge--in-progress';
      default:
        return 'dashboard__status-badge--assigned';
    }
  };

  const formatRoleName = (role: CollaboratorRole): string => {
    const roleMap: Record<CollaboratorRole, string> = {
      [CollaboratorRole.OWNER]: 'Owner',
      [CollaboratorRole.ORGANIZER]: 'Organizer',
      [CollaboratorRole.PROJECT_VIEWER]: 'Project Viewer',
    };
    return roleMap[role] || role;
  };

  const formatStatusName = (status: ProjectStatus): string => {
    const statusMap: Record<ProjectStatus, string> = {
      [ProjectStatus.IN_PROGRESS]: 'In Progress',
      [ProjectStatus.COMPLETED]: 'Completed',
      [ProjectStatus.ARCHIVED]: 'Archived',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Dashboard</h1>
        <p className="dashboard__welcome">Welcome back, {user?.name}!</p>
      </div>

      {error && (
        <div className="dashboard__error">{error}</div>
      )}

      {/* Managed Projects Section */}
      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h2>My Projects</h2>
          {managedProjects.length > 0 && (
            <button
              className="dashboard__view-all-btn"
              onClick={() => navigate('/projects')}
            >
              View All Projects
            </button>
          )}
        </div>

        {projectsLoading ? (
          <div className="dashboard__loading">Loading projects...</div>
        ) : managedProjects.length === 0 ? (
          <div className="dashboard__empty">
            <p>You don't manage any projects yet.</p>
            <button
              className="dashboard__create-btn"
              onClick={() => navigate('/projects')}
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="dashboard__grid">
            {managedProjects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="dashboard__project-card"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="dashboard__card-header">
                  <h3>{project.name}</h3>
                  <div className="dashboard__badges">
                    {project.user_role && (
                      <span className={`dashboard__role-badge dashboard__role-badge--${project.user_role}`}>
                        {formatRoleName(project.user_role)}
                      </span>
                    )}
                    <span className={`dashboard__project-status-badge dashboard__project-status-badge--${project.status}`}>
                      {formatStatusName(project.status)}
                    </span>
                  </div>
                </div>
                {project.description && (
                  <p className="dashboard__card-description">
                    {project.description.length > 100
                      ? `${project.description.substring(0, 100)}...`
                      : project.description}
                  </p>
                )}
                <div className="dashboard__card-footer">
                  <span className="dashboard__card-date">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Zone Assignments Section */}
      <section className="dashboard__section">
        <div className="dashboard__section-header">
          <h2>My Zone Assignments</h2>
          {assignments.length > 0 && (
            <button
              className="dashboard__view-all-btn"
              onClick={() => navigate('/volunteer/zones')}
            >
              View All Zones
            </button>
          )}
        </div>

        {assignmentsLoading ? (
          <div className="dashboard__loading">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="dashboard__empty">
            <p>You don't have any zone assignments yet.</p>
          </div>
        ) : (
          <div className="dashboard__list">
            {assignments.slice(0, 5).map((assignment) => (
              <div
                key={assignment.id}
                className="dashboard__assignment-card"
                onClick={() => navigate(`/volunteer/zones/${assignment.id}`)}
              >
                <div className="dashboard__assignment-main">
                  <div className="dashboard__assignment-info">
                    <h4>{assignment.zone_name}</h4>
                    <p className="dashboard__assignment-project">{assignment.project_name}</p>
                  </div>
                  <span className={`dashboard__status-badge ${getStatusBadgeClass(assignment.status)}`}>
                    {assignment.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="dashboard__assignment-footer">
                  <span className="dashboard__assignment-date">
                    Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                  </span>
                  <svg
                    className="dashboard__chevron"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
