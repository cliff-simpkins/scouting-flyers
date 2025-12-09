"""Completion tracking routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import shape, mapping
import json

from app.database import get_db
from app.models import ZoneAssignment, CompletionArea
from app.schemas.completion import CompletionAreaCreate, CompletionAreaResponse
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/completions", tags=["completions"])
logger = logging.getLogger(__name__)


@router.post("/assignments/{assignment_id}/areas", response_model=CompletionAreaResponse)
async def create_completion_area(
    assignment_id: UUID,
    area_data: CompletionAreaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an area as completed within an assignment"""
    # Verify assignment exists and belongs to current user
    assignment = db.query(ZoneAssignment).filter(ZoneAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    if assignment.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark completion for your own assignments"
        )

    # Convert GeoJSON to PostGIS geometry
    try:
        geom_shape = shape(area_data.geometry)
        geom_wkb = from_shape(geom_shape, srid=4326)
    except Exception as e:
        logger.error(f"Invalid geometry: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid geometry: {str(e)}"
        )

    # Create completion area
    completion_area = CompletionArea(
        assignment_id=assignment_id,
        geometry=geom_wkb,
        notes=area_data.notes
    )

    db.add(completion_area)
    db.commit()
    db.refresh(completion_area)

    logger.info(f"Completion area created for assignment {assignment_id} by {current_user.name}")

    # Convert geometry back to GeoJSON for response
    geometry_geojson = json.loads(db.scalar(completion_area.geometry.ST_AsGeoJSON()))

    return {
        "id": completion_area.id,
        "assignment_id": completion_area.assignment_id,
        "geometry": geometry_geojson,
        "completed_at": completion_area.completed_at,
        "notes": completion_area.notes
    }


@router.get("/assignments/{assignment_id}/areas", response_model=List[CompletionAreaResponse])
async def get_completion_areas(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all completion areas for an assignment"""
    # Verify assignment exists and user has access
    assignment = db.query(ZoneAssignment).filter(ZoneAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    # User must be the volunteer assigned to this zone
    # (or potentially an organizer - we could add that check later)
    if assignment.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view completion for your own assignments"
        )

    # Get all completion areas
    areas = db.query(CompletionArea).filter(
        CompletionArea.assignment_id == assignment_id
    ).all()

    # Convert to response format with GeoJSON
    result = []
    for area in areas:
        geometry_geojson = json.loads(db.scalar(area.geometry.ST_AsGeoJSON()))
        result.append({
            "id": area.id,
            "assignment_id": area.assignment_id,
            "geometry": geometry_geojson,
            "completed_at": area.completed_at,
            "notes": area.notes
        })

    return result


@router.delete("/areas/{area_id}")
async def delete_completion_area(
    area_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a completion area (undo marking)"""
    # Get the area
    area = db.query(CompletionArea).filter(CompletionArea.id == area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Completion area not found"
        )

    # Verify user owns this assignment
    assignment = db.query(ZoneAssignment).filter(ZoneAssignment.id == area.assignment_id).first()
    if assignment.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own completion markings"
        )

    db.delete(area)
    db.commit()

    logger.info(f"Completion area {area_id} deleted by {current_user.name}")

    return {"message": "Completion area deleted successfully"}


@router.get("/assignments/{assignment_id}/progress")
async def get_completion_progress(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate completion progress as percentage of zone area covered"""
    # Verify assignment exists and user has access
    assignment = db.query(ZoneAssignment).filter(ZoneAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    if assignment.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view progress for your own assignments"
        )

    # Get the zone to calculate total area
    from app.models import Zone
    zone = db.query(Zone).filter(Zone.id == assignment.zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )

    # Calculate total zone area (in square meters)
    # ST_Area with geography=true gives area in square meters
    total_area = db.scalar(zone.geometry.ST_Area())

    if total_area == 0:
        return {
            "assignment_id": assignment_id,
            "total_area_sqm": 0,
            "completed_area_sqm": 0,
            "progress_percentage": 0,
            "completion_count": 0
        }

    # Get all completion areas and calculate their total coverage
    # Use ST_Union to merge overlapping areas, then calculate area
    areas = db.query(CompletionArea).filter(
        CompletionArea.assignment_id == assignment_id
    ).all()

    if not areas:
        return {
            "assignment_id": assignment_id,
            "total_area_sqm": float(total_area),
            "completed_area_sqm": 0,
            "progress_percentage": 0,
            "completion_count": 0
        }

    # Union all completion geometries to handle overlaps
    # This SQL query unions all the geometries and calculates the total area
    from sqlalchemy import func, text
    union_query = db.query(
        func.ST_Area(
            func.ST_Union(CompletionArea.geometry)
        )
    ).filter(
        CompletionArea.assignment_id == assignment_id
    ).scalar()

    completed_area = float(union_query) if union_query else 0
    progress_percentage = min(100, (completed_area / total_area) * 100) if total_area > 0 else 0

    return {
        "assignment_id": assignment_id,
        "total_area_sqm": float(total_area),
        "completed_area_sqm": completed_area,
        "progress_percentage": round(progress_percentage, 2),
        "completion_count": len(areas)
    }
