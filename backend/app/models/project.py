"""Project model"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class CollaboratorRole(str, enum.Enum):
    """Collaborator role enum"""
    OWNER = "owner"
    ORGANIZER = "organizer"
    PROJECT_VIEWER = "project_viewer"


class ProjectStatus(str, enum.Enum):
    """Project status enum"""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(Base):
    """Project model for managing flyer distribution projects"""

    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(Enum(ProjectStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ProjectStatus.IN_PROGRESS)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_projects")
    collaborators = relationship("ProjectCollaborator", back_populates="project", cascade="all, delete-orphan")
    zones = relationship("Zone", back_populates="project", cascade="all, delete-orphan")


class ProjectCollaborator(Base):
    """Project collaborator model for managing project team members"""

    __tablename__ = "project_collaborators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(CollaboratorRole, values_callable=lambda x: [e.value for e in x]), nullable=False, default=CollaboratorRole.PROJECT_VIEWER)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    invited_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="collaborators")
    user = relationship("User", foreign_keys=[user_id], backref="project_collaborations")
    inviter = relationship("User", foreign_keys=[invited_by])
