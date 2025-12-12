"""Zone model for database operations"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
import uuid

from app.database import Base


class Zone(Base):
    """Zone model - represents a geographic area for flyer distribution"""

    __tablename__ = "zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    geometry = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=False)
    color = Column(String(7))  # Hex color (e.g., #FF5733)
    kml_metadata = Column(JSONB)  # Additional KML metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="zones")
    assignments = relationship("ZoneAssignment", back_populates="zone", cascade="all, delete-orphan")
    houses = relationship("House", back_populates="zone", cascade="all, delete-orphan")


class ZoneAssignment(Base):
    """Zone assignment model - assigns volunteers to zones"""

    __tablename__ = "zone_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    status = Column(String(50), default='assigned')  # assigned, in_progress, completed
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    notes = Column(Text)  # Zone-level notes from volunteer
    manual_completion_percentage = Column(Integer)  # Manual override for completion percentage (0-100)

    # Relationships
    zone = relationship("Zone", back_populates="assignments")
    volunteer = relationship("User", foreign_keys=[volunteer_id])
    assigner = relationship("User", foreign_keys=[assigned_by])
    completion_areas = relationship("CompletionArea", back_populates="assignment", cascade="all, delete-orphan")
    notes_list = relationship("AssignmentNote", back_populates="assignment", cascade="all, delete-orphan", order_by="AssignmentNote.created_at.desc()")


class AssignmentNote(Base):
    """Assignment notes with user attribution and timestamps"""

    __tablename__ = "assignment_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("zone_assignments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignment = relationship("ZoneAssignment", back_populates="notes_list")
    author = relationship("User", foreign_keys=[user_id])


class House(Base):
    """House model - represents individual houses within a zone"""

    __tablename__ = "houses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    address = Column(Text)
    house_metadata = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="houses")
    visits = relationship("HouseVisit", back_populates="house", cascade="all, delete-orphan")


class HouseVisit(Base):
    """House visit model - tracks which houses have been visited"""

    __tablename__ = "house_visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    house_id = Column(UUID(as_uuid=True), ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    zone_assignment_id = Column(UUID(as_uuid=True), ForeignKey("zone_assignments.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    visited_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    notes = Column(Text)
    offline_sync = Column(String(50), default=False)

    # Relationships
    house = relationship("House", back_populates="visits")
    assignment = relationship("ZoneAssignment")
    volunteer = relationship("User")
