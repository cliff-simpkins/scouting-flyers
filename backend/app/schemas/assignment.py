"""Assignment schemas for request/response validation"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.schemas.assignment_note import AssignmentNoteResponse


class AssignmentCreate(BaseModel):
    """Schema for creating a new assignment"""
    zone_id: UUID
    volunteer_id: UUID


class AssignmentUpdate(BaseModel):
    """Schema for organizers to update assignments"""
    status: Optional[str] = Field(None, pattern='^(assigned|in_progress|completed)$')
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class VolunteerStatusUpdate(BaseModel):
    """Schema for volunteers to update their own assignment status"""
    status: str = Field(..., pattern='^(in_progress|completed)$')


class VolunteerAssignmentUpdate(BaseModel):
    """Schema for volunteers to update their assignment notes and completion percentage"""
    notes: Optional[str] = None
    manual_completion_percentage: Optional[int] = Field(None, ge=0, le=100)


class AssignmentResponse(BaseModel):
    """Basic assignment response schema"""
    id: UUID
    zone_id: UUID
    volunteer_id: UUID
    assigned_by: UUID
    assigned_at: datetime
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    manual_completion_percentage: Optional[int] = Field(None, ge=0, le=100)

    class Config:
        from_attributes = True


class AssignmentWithVolunteer(AssignmentResponse):
    """Assignment with volunteer details (for organizers)"""
    volunteer_name: str
    volunteer_email: str
    volunteer_picture_url: Optional[str] = None
    notes_count: int = 0


class AssignmentWithZone(AssignmentResponse):
    """Assignment with zone/project details (for volunteers)"""
    zone_name: str
    zone_color: Optional[str] = None
    project_id: UUID
    project_name: str
    zone_geometry: dict  # GeoJSON
    notes_list: List[AssignmentNoteResponse] = []
    other_volunteers: List['AssignmentWithVolunteer'] = []


class VolunteerInfo(BaseModel):
    """Available volunteer information for assignment dropdown"""
    id: UUID
    name: str
    email: str
    picture_url: Optional[str] = None
    current_assignments_count: int
