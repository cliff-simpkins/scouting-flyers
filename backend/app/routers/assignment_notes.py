"""Assignment notes routes - allows volunteers to add/edit/delete notes on their assignments"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User
from app.models.zone import ZoneAssignment, AssignmentNote
from app.schemas.assignment_note import (
    AssignmentNoteCreate,
    AssignmentNoteUpdate,
    AssignmentNoteResponse
)
from app.routers.auth import get_current_user
from app.routers.assignments import check_assignment_access

router = APIRouter(prefix="/assignment-notes", tags=["assignment-notes"])
logger = logging.getLogger(__name__)


@router.get("/assignments/{assignment_id}/notes", response_model=List[AssignmentNoteResponse])
async def get_assignment_notes(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all notes for an assignment (volunteer or organizer can access)"""
    # Check user has access to this assignment
    check_assignment_access(assignment_id, current_user, db)

    # Get notes ordered by creation date (newest first)
    notes = db.query(AssignmentNote)\
        .filter(AssignmentNote.assignment_id == assignment_id)\
        .order_by(AssignmentNote.created_at.desc())\
        .all()

    # Enrich with author details
    result = []
    for note in notes:
        author = db.query(User).filter(User.id == note.user_id).first()
        result.append({
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

    return result


@router.post("/assignments/{assignment_id}/notes", response_model=AssignmentNoteResponse)
async def create_assignment_note(
    assignment_id: UUID,
    note_data: AssignmentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new note for an assignment (volunteer must be assigned)"""
    # Check that user is the volunteer for this assignment
    assignment = check_assignment_access(assignment_id, current_user, db, require_volunteer=True)

    # Create note
    note = AssignmentNote(
        assignment_id=assignment_id,
        user_id=current_user.id,
        content=note_data.content
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    logger.info(f"Note created for assignment {assignment_id} by {current_user.name}")

    return {
        "id": note.id,
        "assignment_id": note.assignment_id,
        "user_id": note.user_id,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "author_name": current_user.name,
        "author_email": current_user.email,
        "author_picture_url": current_user.picture_url
    }


@router.patch("/notes/{note_id}", response_model=AssignmentNoteResponse)
async def update_assignment_note(
    note_id: UUID,
    note_data: AssignmentNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a note (only the author can edit)"""
    note = db.query(AssignmentNote).filter(AssignmentNote.id == note_id).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Only the author can edit their own note
    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own notes"
        )

    note.content = note_data.content
    db.commit()
    db.refresh(note)

    logger.info(f"Note {note_id} updated by {current_user.name}")

    return {
        "id": note.id,
        "assignment_id": note.assignment_id,
        "user_id": note.user_id,
        "content": note.content,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "author_name": current_user.name,
        "author_email": current_user.email,
        "author_picture_url": current_user.picture_url
    }


@router.delete("/notes/{note_id}")
async def delete_assignment_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a note (only the author can delete)"""
    note = db.query(AssignmentNote).filter(AssignmentNote.id == note_id).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )

    # Only the author can delete their own note
    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own notes"
        )

    db.delete(note)
    db.commit()

    logger.info(f"Note {note_id} deleted by {current_user.name}")

    return {"message": "Note deleted successfully"}
