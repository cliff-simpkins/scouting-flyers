"""Assignment note schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class AssignmentNoteCreate(BaseModel):
    """Create note"""
    content: str = Field(..., min_length=1)


class AssignmentNoteUpdate(BaseModel):
    """Update note"""
    content: str = Field(..., min_length=1)


class AssignmentNoteResponse(BaseModel):
    """Note response with author details"""
    id: UUID
    assignment_id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    author_picture_url: Optional[str] = None

    class Config:
        from_attributes = True
