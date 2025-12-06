"""Project schemas for request/response validation"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.project import CollaboratorRole


# Project schemas
class ProjectCreate(BaseModel):
    """Schema for creating a new project"""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    is_active: Optional[bool] = Field(None, description="Whether project is active")


class ProjectResponse(BaseModel):
    """Schema for project in responses"""
    id: UUID
    name: str
    description: Optional[str]
    owner_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Collaborator schemas
class CollaboratorBase(BaseModel):
    """Base schema for collaborator"""
    user_id: UUID
    role: CollaboratorRole = CollaboratorRole.VIEWER


class CollaboratorInvite(BaseModel):
    """Schema for inviting a collaborator"""
    email: str = Field(..., description="Email of user to invite")
    role: CollaboratorRole = Field(CollaboratorRole.VIEWER, description="Role to assign")


class CollaboratorResponse(BaseModel):
    """Schema for collaborator in responses"""
    id: UUID
    project_id: UUID
    user_id: UUID
    role: CollaboratorRole
    invited_by: UUID
    invited_at: datetime

    # User details
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectWithCollaborators(ProjectResponse):
    """Schema for project with collaborators"""
    collaborators: List[CollaboratorResponse] = []

    class Config:
        from_attributes = True
