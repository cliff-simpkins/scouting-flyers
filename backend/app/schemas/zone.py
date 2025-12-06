"""Zone schemas for API requests and responses"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


class ZoneBase(BaseModel):
    """Base zone schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class ZoneCreate(ZoneBase):
    """Schema for creating a zone"""
    geometry: dict  # GeoJSON geometry
    kml_metadata: Optional[dict] = None


class ZoneUpdate(BaseModel):
    """Schema for updating a zone"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    kml_metadata: Optional[dict] = None


class Zone(ZoneBase):
    """Schema for zone response"""
    id: UUID
    project_id: UUID
    geometry: dict  # GeoJSON geometry
    kml_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ZoneWithStats(Zone):
    """Zone with statistics"""
    total_houses: int = 0
    visited_houses: int = 0
    completion_percentage: float = 0.0
    assigned_volunteers: List[UUID] = []


class KMLImportRequest(BaseModel):
    """Schema for KML import request"""
    project_id: UUID
    kml_content: str = Field(..., description="KML file content as string")
    zones_to_skip: Optional[List[str]] = Field(default=[], description="List of zone names to skip during import")


class KMLImportResponse(BaseModel):
    """Schema for KML import response"""
    zones_created: int
    zones: List[Zone]
    errors: List[str] = []


class ZoneAssignmentCreate(BaseModel):
    """Schema for creating a zone assignment"""
    zone_id: UUID
    volunteer_id: UUID


class ZoneAssignment(BaseModel):
    """Schema for zone assignment response"""
    id: UUID
    zone_id: UUID
    volunteer_id: UUID
    assigned_by: UUID
    assigned_at: datetime
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
