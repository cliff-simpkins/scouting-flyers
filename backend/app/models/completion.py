"""Completion tracking models"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
import uuid

from app.database import Base


class CompletionArea(Base):
    """
    Represents an area marked as completed within a zone assignment.
    Volunteers mark sections of their assigned zone as they complete distribution.
    """
    __tablename__ = "completion_areas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("zone_assignments.id", ondelete="CASCADE"), nullable=False)

    # Geometry representing the completed area (Point, LineString, or Polygon)
    # SRID 4326 = WGS84 (standard GPS coordinates)
    geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=False)

    # When this area was marked as complete
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Optional notes from the volunteer
    notes = Column(String, nullable=True)

    # Relationship to assignment
    assignment = relationship("ZoneAssignment", back_populates="completion_areas")
