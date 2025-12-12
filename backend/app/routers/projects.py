"""Project management endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectCollaborator, CollaboratorRole
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithCollaborators,
    CollaboratorInvite,
    CollaboratorResponse
)

router = APIRouter(prefix="/projects", tags=["projects"])


def check_project_access(
    project_id: UUID,
    user: User,
    db: Session,
    required_role: CollaboratorRole = None
) -> Project:
    """
    Check if user has access to a project

    Args:
        project_id: Project ID
        user: Current user
        db: Database session
        required_role: Required role (owner or organizer)

    Returns:
        Project if user has access

    Raises:
        HTTPException: If project not found or user doesn't have access
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Check if user is owner or collaborator
    is_owner = project.owner_id == user.id
    collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()

    has_access = is_owner or collaborator is not None

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )

    # Check role if required
    if required_role:
        if required_role == CollaboratorRole.OWNER and not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the project owner can perform this action"
            )

        if required_role == CollaboratorRole.ORGANIZER:
            if not is_owner and (not collaborator or collaborator.role not in [CollaboratorRole.OWNER, CollaboratorRole.ORGANIZER]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You need organizer or owner permissions to perform this action"
                )

    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of projects the user owns or collaborates on"""
    # Get projects owned by user
    owned_projects = db.query(Project).filter(
        Project.owner_id == current_user.id
    ).all()

    # Get projects user collaborates on
    collaborations = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.user_id == current_user.id
    ).all()

    collab_projects = [
        db.query(Project).filter(Project.id == collab.project_id).first()
        for collab in collaborations
    ]

    # Combine and deduplicate
    all_projects = list({p.id: p for p in owned_projects + collab_projects}.values())

    # Enrich with user_role
    enriched_projects = []
    for project in all_projects:
        # Determine user's role
        if project.owner_id == current_user.id:
            user_role = CollaboratorRole.OWNER
        else:
            collab = db.query(ProjectCollaborator).filter(
                ProjectCollaborator.project_id == project.id,
                ProjectCollaborator.user_id == current_user.id
            ).first()
            user_role = collab.role if collab else None

        project_dict = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "is_active": project.is_active,
            "status": project.status,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "user_role": user_role
        }
        enriched_projects.append(project_dict)

    return enriched_projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


@router.get("/{project_id}", response_model=ProjectWithCollaborators)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details with collaborators"""
    project = check_project_access(project_id, current_user, db)

    # Get collaborators with user details
    collaborators = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id
    ).all()

    # Enrich collaborator data with user info
    enriched_collaborators = []
    for collab in collaborators:
        user = db.query(User).filter(User.id == collab.user_id).first()
        collab_dict = {
            "id": collab.id,
            "project_id": collab.project_id,
            "user_id": collab.user_id,
            "role": collab.role,
            "invited_by": collab.invited_by,
            "invited_at": collab.invited_at,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None
        }
        enriched_collaborators.append(CollaboratorResponse(**collab_dict))

    project_dict = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "owner_id": project.owner_id,
        "is_active": project.is_active,
        "status": project.status,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "collaborators": enriched_collaborators
    }

    return ProjectWithCollaborators(**project_dict)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project (owner or organizer only)"""
    project = check_project_access(project_id, current_user, db, CollaboratorRole.ORGANIZER)

    # Update fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.is_active is not None:
        project.is_active = project_data.is_active

    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project (owner only)"""
    project = check_project_access(project_id, current_user, db, CollaboratorRole.OWNER)

    db.delete(project)
    db.commit()

    return None


# Collaborator endpoints

@router.get("/{project_id}/collaborators", response_model=List[CollaboratorResponse])
async def list_collaborators(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of project collaborators"""
    check_project_access(project_id, current_user, db)

    collaborators = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id
    ).all()

    # Enrich with user details
    enriched_collaborators = []
    for collab in collaborators:
        user = db.query(User).filter(User.id == collab.user_id).first()
        collab_dict = {
            "id": collab.id,
            "project_id": collab.project_id,
            "user_id": collab.user_id,
            "role": collab.role,
            "invited_by": collab.invited_by,
            "invited_at": collab.invited_at,
            "user_email": user.email if user else None,
            "user_name": user.name if user else None
        }
        enriched_collaborators.append(CollaboratorResponse(**collab_dict))

    return enriched_collaborators


@router.post("/{project_id}/collaborators", response_model=CollaboratorResponse, status_code=status.HTTP_201_CREATED)
async def invite_collaborator(
    project_id: UUID,
    invite_data: CollaboratorInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a collaborator to the project (owner or organizer only)"""
    project = check_project_access(project_id, current_user, db, CollaboratorRole.ORGANIZER)

    # Find user by email
    user = db.query(User).filter(User.email == invite_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {invite_data.email} not found"
        )

    # Check if user is already a collaborator
    existing = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a collaborator on this project"
        )

    # Check if user is the owner
    if user.id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add owner as a collaborator"
        )

    # Create collaborator
    collaborator = ProjectCollaborator(
        project_id=project_id,
        user_id=user.id,
        role=invite_data.role,
        invited_by=current_user.id
    )

    db.add(collaborator)
    db.commit()
    db.refresh(collaborator)

    # Return enriched response
    collab_dict = {
        "id": collaborator.id,
        "project_id": collaborator.project_id,
        "user_id": collaborator.user_id,
        "role": collaborator.role,
        "invited_by": collaborator.invited_by,
        "invited_at": collaborator.invited_at,
        "user_email": user.email,
        "user_name": user.name
    }

    return CollaboratorResponse(**collab_dict)


@router.delete("/{project_id}/collaborators/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a collaborator from the project (owner or organizer only)"""
    check_project_access(project_id, current_user, db, CollaboratorRole.ORGANIZER)

    collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user_id
    ).first()

    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )

    db.delete(collaborator)
    db.commit()

    return None
