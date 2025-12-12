"""Zone assignment routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import json

from app.database import get_db
from app.models import Zone, Project, User
from app.models.zone import ZoneAssignment, AssignmentNote
from app.models.project import CollaboratorRole, ProjectCollaborator
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    VolunteerStatusUpdate,
    VolunteerAssignmentUpdate,
    AssignmentResponse,
    AssignmentWithVolunteer,
    AssignmentWithZone,
    VolunteerInfo
)
from app.routers.auth import get_current_user
from app.routers.projects import check_project_access

router = APIRouter(prefix="/assignments", tags=["assignments"])
logger = logging.getLogger(__name__)


def check_assignment_access(
    assignment_id: UUID,
    user: User,
    db: Session,
    require_volunteer: bool = False
) -> ZoneAssignment:
    """
    Check if user has access to an assignment

    Args:
        assignment_id: Assignment ID
        user: Current user
        db: Database session
        require_volunteer: If True, user must be the assigned volunteer

    Returns:
        ZoneAssignment if access granted

    Raises:
        HTTPException: 404 if not found, 403 if no access
    """
    assignment = db.query(ZoneAssignment).filter(ZoneAssignment.id == assignment_id).first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # If require_volunteer, user must be the volunteer
    if require_volunteer:
        if assignment.volunteer_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own assignments"
            )
        return assignment

    # Otherwise, check if user has access to the project
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )

    # Check if user is the volunteer OR has project access
    if assignment.volunteer_id == user.id:
        return assignment

    # Check project access
    check_project_access(zone.project_id, user, db)
    return assignment


def check_can_assign_volunteers(project_id: UUID, user: User, db: Session) -> Project:
    """
    Check if user can assign volunteers (must be owner or organizer)

    Returns:
        Project if access granted

    Raises:
        HTTPException: 404 if not found, 403 if no access
    """
    return check_project_access(project_id, user, db, CollaboratorRole.ORGANIZER)


# Organizer Endpoints


@router.get("/projects/{project_id}", response_model=List[AssignmentWithVolunteer])
async def get_project_assignments(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all assignments for a project"""
    # Check project access
    check_project_access(project_id, current_user, db)

    # Get all assignments for zones in this project
    assignments = db.query(ZoneAssignment)\
        .join(Zone, Zone.id == ZoneAssignment.zone_id)\
        .filter(Zone.project_id == project_id)\
        .all()

    # Enrich with volunteer details and notes count
    result = []
    for assignment in assignments:
        volunteer = db.query(User).filter(User.id == assignment.volunteer_id).first()
        notes_count = db.query(AssignmentNote).filter(AssignmentNote.assignment_id == assignment.id).count()
        result.append({
            "id": assignment.id,
            "zone_id": assignment.zone_id,
            "volunteer_id": assignment.volunteer_id,
            "assigned_by": assignment.assigned_by,
            "assigned_at": assignment.assigned_at,
            "status": assignment.status,
            "started_at": assignment.started_at,
            "completed_at": assignment.completed_at,
            "volunteer_name": volunteer.name if volunteer else "Unknown",
            "volunteer_email": volunteer.email if volunteer else "",
            "volunteer_picture_url": volunteer.picture_url if volunteer else None,
            "manual_completion_percentage": assignment.manual_completion_percentage,
            "notes": assignment.notes,
            "notes_count": notes_count
        })

    return result


@router.post("/projects/{project_id}", response_model=AssignmentWithVolunteer)
async def create_assignment(
    project_id: UUID,
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new volunteer assignment"""
    # Check if user can assign volunteers (must be organizer or owner)
    check_can_assign_volunteers(project_id, current_user, db)

    # Verify zone exists and belongs to this project
    zone = db.query(Zone).filter(Zone.id == assignment_data.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )

    if zone.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone does not belong to this project"
        )

    # Verify volunteer exists
    volunteer = db.query(User).filter(User.id == assignment_data.volunteer_id).first()
    if not volunteer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer not found"
        )

    # Check for duplicate active assignment (same volunteer + zone)
    existing = db.query(ZoneAssignment)\
        .filter(
            ZoneAssignment.zone_id == assignment_data.zone_id,
            ZoneAssignment.volunteer_id == assignment_data.volunteer_id,
            ZoneAssignment.status != 'completed'
        )\
        .first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This volunteer is already assigned to this zone"
        )

    # Create assignment
    assignment = ZoneAssignment(
        zone_id=assignment_data.zone_id,
        volunteer_id=assignment_data.volunteer_id,
        assigned_by=current_user.id,
        status='assigned'
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    logger.info(f"Assignment created: volunteer {volunteer.name} assigned to zone {zone.name} by {current_user.name}")

    return {
        "id": assignment.id,
        "zone_id": assignment.zone_id,
        "volunteer_id": assignment.volunteer_id,
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
        "status": assignment.status,
        "started_at": assignment.started_at,
        "completed_at": assignment.completed_at,
        "volunteer_name": volunteer.name,
        "volunteer_email": volunteer.email,
        "volunteer_picture_url": volunteer.picture_url
    }


@router.get("/zones/{zone_id}", response_model=List[AssignmentWithVolunteer])
async def get_zone_assignments(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all assignments for a specific zone"""
    # Verify zone exists and check project access
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )

    check_project_access(zone.project_id, current_user, db)

    # Get assignments
    assignments = db.query(ZoneAssignment)\
        .filter(ZoneAssignment.zone_id == zone_id)\
        .all()

    # Enrich with volunteer details
    result = []
    for assignment in assignments:
        volunteer = db.query(User).filter(User.id == assignment.volunteer_id).first()
        result.append({
            "id": assignment.id,
            "zone_id": assignment.zone_id,
            "volunteer_id": assignment.volunteer_id,
            "assigned_by": assignment.assigned_by,
            "assigned_at": assignment.assigned_at,
            "status": assignment.status,
            "started_at": assignment.started_at,
            "completed_at": assignment.completed_at,
            "volunteer_name": volunteer.name if volunteer else "Unknown",
            "volunteer_email": volunteer.email if volunteer else "",
            "volunteer_picture_url": volunteer.picture_url if volunteer else None
        })

    return result


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: UUID,
    update_data: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update assignment (organizer only)"""
    # Get assignment and check access
    assignment = check_assignment_access(assignment_id, current_user, db)

    # Check if user can manage assignments (must be organizer or owner)
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    check_can_assign_volunteers(zone.project_id, current_user, db)

    # Update fields
    if update_data.status is not None:
        assignment.status = update_data.status
    if update_data.started_at is not None:
        assignment.started_at = update_data.started_at
    if update_data.completed_at is not None:
        assignment.completed_at = update_data.completed_at

    db.commit()
    db.refresh(assignment)

    logger.info(f"Assignment {assignment_id} updated by {current_user.name}")

    return assignment


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an assignment (unassign volunteer)"""
    # Get assignment and check access
    assignment = check_assignment_access(assignment_id, current_user, db)

    # Check if user can manage assignments (must be organizer or owner)
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    check_can_assign_volunteers(zone.project_id, current_user, db)

    db.delete(assignment)
    db.commit()

    logger.info(f"Assignment {assignment_id} deleted by {current_user.name}")

    return {"message": "Assignment deleted successfully"}


@router.get("/projects/{project_id}/available-volunteers", response_model=List[VolunteerInfo])
async def get_available_volunteers(
    project_id: UUID,
    zone_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users who can be assigned to zones in this project"""
    # Check if user can assign volunteers
    project = check_can_assign_volunteers(project_id, current_user, db)

    # Get project owner
    volunteers = []
    owner = db.query(User).filter(User.id == project.owner_id).first()
    if owner:
        # Count current active assignments
        count = db.query(ZoneAssignment)\
            .join(Zone)\
            .filter(
                Zone.project_id == project_id,
                ZoneAssignment.volunteer_id == owner.id,
                ZoneAssignment.status.in_(['assigned', 'in_progress'])
            )\
            .count()

        volunteers.append({
            "id": owner.id,
            "name": owner.name,
            "email": owner.email,
            "picture_url": owner.picture_url,
            "current_assignments_count": count
        })

    # Get all collaborators
    collaborators = db.query(ProjectCollaborator)\
        .filter(ProjectCollaborator.project_id == project_id)\
        .all()

    for collab in collaborators:
        user = db.query(User).filter(User.id == collab.user_id).first()
        if user and user.id != owner.id:  # Don't duplicate owner
            # Count current active assignments
            count = db.query(ZoneAssignment)\
                .join(Zone)\
                .filter(
                    Zone.project_id == project_id,
                    ZoneAssignment.volunteer_id == user.id,
                    ZoneAssignment.status.in_(['assigned', 'in_progress'])
                )\
                .count()

            volunteers.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "picture_url": user.picture_url,
                "current_assignments_count": count
            })

    # If zone_id is provided, filter out users already assigned to that zone
    if zone_id:
        existing_assignments = db.query(ZoneAssignment.volunteer_id)\
            .filter(
                ZoneAssignment.zone_id == zone_id,
                ZoneAssignment.status != 'completed'
            )\
            .all()
        assigned_ids = {a[0] for a in existing_assignments}
        volunteers = [v for v in volunteers if v["id"] not in assigned_ids]

    return volunteers


# Volunteer Endpoints


@router.get("/my-assignments", response_model=List[AssignmentWithZone])
async def get_my_assignments(
    project_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all assignments for the current user"""
    query = db.query(ZoneAssignment)\
        .join(Zone)\
        .join(Project)\
        .filter(ZoneAssignment.volunteer_id == current_user.id)

    # Filter by project if specified
    if project_id:
        query = query.filter(Zone.project_id == project_id)

    assignments = query.all()

    # Enrich with zone and project details
    result = []
    for assignment in assignments:
        zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
        project = db.query(Project).filter(Project.id == zone.project_id).first()

        # Get geometry as GeoJSON
        geometry_geojson = json.loads(db.scalar(zone.geometry.ST_AsGeoJSON()))

        result.append({
            "id": assignment.id,
            "zone_id": assignment.zone_id,
            "volunteer_id": assignment.volunteer_id,
            "assigned_by": assignment.assigned_by,
            "assigned_at": assignment.assigned_at,
            "status": assignment.status,
            "started_at": assignment.started_at,
            "completed_at": assignment.completed_at,
            "notes": assignment.notes,
            "manual_completion_percentage": assignment.manual_completion_percentage,
            "zone_name": zone.name,
            "zone_color": zone.color,
            "project_id": project.id,
            "project_name": project.name,
            "zone_geometry": geometry_geojson
        })

    return result


@router.get("/my-assignments/{assignment_id}", response_model=AssignmentWithZone)
async def get_my_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific assignment details for current user"""
    # Check that assignment belongs to current user
    assignment = check_assignment_access(assignment_id, current_user, db, require_volunteer=True)

    # Get zone and project details
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    project = db.query(Project).filter(Project.id == zone.project_id).first()

    # Get geometry as GeoJSON
    geometry_geojson = json.loads(db.scalar(zone.geometry.ST_AsGeoJSON()))

    # Get other volunteers assigned to this zone
    from app.models.zone import AssignmentNote
    other_assignments = db.query(ZoneAssignment)\
        .filter(
            ZoneAssignment.zone_id == assignment.zone_id,
            ZoneAssignment.id != assignment_id
        )\
        .all()

    other_volunteers = []
    for other_assign in other_assignments:
        volunteer = db.query(User).filter(User.id == other_assign.volunteer_id).first()
        other_volunteers.append({
            "id": other_assign.id,
            "zone_id": other_assign.zone_id,
            "volunteer_id": other_assign.volunteer_id,
            "assigned_by": other_assign.assigned_by,
            "assigned_at": other_assign.assigned_at,
            "status": other_assign.status,
            "started_at": other_assign.started_at,
            "completed_at": other_assign.completed_at,
            "notes": other_assign.notes,
            "manual_completion_percentage": other_assign.manual_completion_percentage,
            "volunteer_name": volunteer.name if volunteer else "Unknown",
            "volunteer_email": volunteer.email if volunteer else "",
            "volunteer_picture_url": volunteer.picture_url if volunteer else None
        })

    # Get notes list
    notes = db.query(AssignmentNote)\
        .filter(AssignmentNote.assignment_id == assignment_id)\
        .order_by(AssignmentNote.created_at.desc())\
        .all()

    notes_list = []
    for note in notes:
        author = db.query(User).filter(User.id == note.user_id).first()
        notes_list.append({
            "id": note.id,
            "assignment_id": note.assignment_id,
            "user_id": note.user_id,
            "content": note.content,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
            "author_name": author.name if author else "Unknown",
            "author_email": author.email if author else "",
            "author_picture_url": author.picture_url if author else None
        })

    # Get assigned_by user name
    assigned_by_user = db.query(User).filter(User.id == assignment.assigned_by).first()
    assigned_by_name = assigned_by_user.name if assigned_by_user else "Unknown"

    return {
        "id": assignment.id,
        "zone_id": assignment.zone_id,
        "volunteer_id": assignment.volunteer_id,
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
        "status": assignment.status,
        "started_at": assignment.started_at,
        "completed_at": assignment.completed_at,
        "notes": assignment.notes,
        "manual_completion_percentage": assignment.manual_completion_percentage,
        "zone_name": zone.name,
        "zone_color": zone.color,
        "project_id": project.id,
        "project_name": project.name,
        "zone_geometry": geometry_geojson,
        "notes_list": notes_list,
        "other_volunteers": other_volunteers,
        "assigned_by_name": assigned_by_name
    }


@router.patch("/my-assignments/{assignment_id}/status", response_model=AssignmentWithZone)
async def update_my_assignment_status(
    assignment_id: UUID,
    status_update: VolunteerStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update assignment status (volunteer can only update their own)"""
    # Check that assignment belongs to current user
    assignment = check_assignment_access(assignment_id, current_user, db, require_volunteer=True)

    # Validate status transition
    old_status = assignment.status
    allowed_transitions = {
        'assigned': ['in_progress'],
        'in_progress': ['assigned', 'completed'],
        'completed': ['in_progress']  # Allow reactivating completed zones
    }

    if status_update.status not in allowed_transitions.get(old_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {old_status} to {status_update.status}. "
                   f"Allowed transitions: {', '.join(allowed_transitions.get(old_status, []))}"
        )

    # Update status
    assignment.status = status_update.status

    # Auto-set timestamps
    if status_update.status == 'in_progress':
        if old_status == 'completed':
            # Reactivating a completed zone - clear completed_at
            assignment.completed_at = None
        if not assignment.started_at:
            # First time starting
            assignment.started_at = datetime.utcnow()
    elif status_update.status == 'completed' and not assignment.completed_at:
        assignment.completed_at = datetime.utcnow()
    elif status_update.status == 'assigned' and old_status == 'in_progress':
        # Reset when going back to assigned
        assignment.started_at = None

    db.commit()
    db.refresh(assignment)

    logger.info(f"Assignment {assignment_id} status updated from {old_status} to {status_update.status} by volunteer {current_user.name}")

    # Get zone and project details for response
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    project = db.query(Project).filter(Project.id == zone.project_id).first()
    geometry_geojson = json.loads(db.scalar(zone.geometry.ST_AsGeoJSON()))

    # Return with empty lists for notes and other volunteers (can be populated on full get)
    return {
        "id": assignment.id,
        "zone_id": assignment.zone_id,
        "volunteer_id": assignment.volunteer_id,
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
        "status": assignment.status,
        "started_at": assignment.started_at,
        "completed_at": assignment.completed_at,
        "notes": assignment.notes,
        "manual_completion_percentage": assignment.manual_completion_percentage,
        "zone_name": zone.name,
        "zone_color": zone.color,
        "project_id": project.id,
        "project_name": project.name,
        "zone_geometry": geometry_geojson,
        "notes_list": [],
        "other_volunteers": []
    }


@router.patch("/my-assignments/{assignment_id}", response_model=AssignmentWithZone)
async def update_my_assignment(
    assignment_id: UUID,
    update_data: VolunteerAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update assignment notes and manual completion percentage (volunteer only)"""
    # Check that assignment belongs to current user
    assignment = check_assignment_access(assignment_id, current_user, db, require_volunteer=True)

    # Update notes if provided
    if update_data.notes is not None:
        assignment.notes = update_data.notes

    # Update manual completion percentage if provided
    if update_data.manual_completion_percentage is not None:
        assignment.manual_completion_percentage = update_data.manual_completion_percentage

    db.commit()
    db.refresh(assignment)

    logger.info(f"Assignment {assignment_id} updated by volunteer {current_user.name}")

    # Get zone and project details for response
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    project = db.query(Project).filter(Project.id == zone.project_id).first()
    geometry_geojson = json.loads(db.scalar(zone.geometry.ST_AsGeoJSON()))

    return {
        "id": assignment.id,
        "zone_id": assignment.zone_id,
        "volunteer_id": assignment.volunteer_id,
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
        "status": assignment.status,
        "started_at": assignment.started_at,
        "completed_at": assignment.completed_at,
        "notes": assignment.notes,
        "manual_completion_percentage": assignment.manual_completion_percentage,
        "zone_name": zone.name,
        "zone_color": zone.color,
        "project_id": project.id,
        "project_name": project.name,
        "zone_geometry": geometry_geojson
    }
