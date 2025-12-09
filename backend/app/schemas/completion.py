"""Completion area schemas for request/response validation"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class CompletionAreaCreate(BaseModel):
    """Schema for creating a completion area"""
    geometry: dict  # GeoJSON geometry (Point, LineString, or Polygon)
    notes: Optional[str] = None


class CompletionAreaResponse(BaseModel):
    """Schema for completion area response"""
    id: UUID
    assignment_id: UUID
    geometry: dict  # GeoJSON geometry
    completed_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True
