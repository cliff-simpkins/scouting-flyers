"""Zone management routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import json

from app.database import get_db
from app.models import Zone, Project
from app.models.user import User
from app.schemas.zone import (
    Zone as ZoneSchema,
    ZoneCreate,
    ZoneUpdate,
    KMLImportRequest,
    KMLImportResponse
)
from app.routers.auth import get_current_user
from app.utils.kml_parser import parse_kml, convert_geojson_to_wkt
from geoalchemy2.elements import WKTElement

router = APIRouter(prefix="/zones", tags=["zones"])
logger = logging.getLogger(__name__)


def _check_project_access(project_id: UUID, user: User, db: Session) -> Project:
    """Check if user has access to project"""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Check if user is owner or collaborator
    is_owner = project.owner_id == user.id
    is_collaborator = any(
        collab.user_id == user.id
        for collab in project.collaborators
    )

    if not (is_owner or is_collaborator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )

    return project


@router.get("/project/{project_id}", response_model=List[ZoneSchema])
async def get_project_zones(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all zones for a project"""
    _check_project_access(project_id, current_user, db)

    zones = db.query(Zone).filter(Zone.project_id == project_id).all()

    # Convert geometry to GeoJSON for each zone
    result = []
    for zone in zones:
        zone_dict = {
            "id": zone.id,
            "project_id": zone.project_id,
            "name": zone.name,
            "description": zone.description,
            "geometry": json.loads(db.scalar(zone.geometry.ST_AsGeoJSON())),  # Parse GeoJSON string to dict
            "color": zone.color,
            "kml_metadata": zone.kml_metadata,
            "created_at": zone.created_at,
            "updated_at": zone.updated_at
        }
        result.append(zone_dict)

    return result


@router.post("/preview-kml")
async def preview_kml(
    request: KMLImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview zones from KML file without importing"""

    # Check project access
    _check_project_access(request.project_id, current_user, db)

    # Parse KML
    zones_data, errors = parse_kml(request.kml_content)

    if not zones_data and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse KML: {'; '.join(errors)}"
        )

    # Return zone names for duplicate checking
    zone_names = [zone_data['name'] for zone_data in zones_data]

    return {
        "zone_count": len(zone_names),
        "zone_names": zone_names,
        "errors": errors
    }


@router.post("/import-kml", response_model=KMLImportResponse)
async def import_kml(
    request: KMLImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import zones from KML file"""

    # Check project access
    project = _check_project_access(request.project_id, current_user, db)

    # Parse KML
    zones_data, errors = parse_kml(request.kml_content)

    if not zones_data and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse KML: {'; '.join(errors)}"
        )

    # Create zones in database
    created_zones = []
    zones_to_skip = request.zones_to_skip or []

    # Convert skip list to lowercase for case-insensitive comparison
    zones_to_skip_lower = [name.lower() for name in zones_to_skip]

    logger.debug(f"Received zones_to_skip: {zones_to_skip}")
    logger.debug(f"zones_to_skip_lower: {zones_to_skip_lower}")
    logger.debug(f"Zone names from KML: {[z['name'] for z in zones_data]}")
    logger.info(f"Processing KML import: {len(zones_data)} zones in file, {len(zones_to_skip)} zones to skip")

    for zone_data in zones_data:
        # Skip zones that user declined to import (case-insensitive)
        if zone_data['name'].lower() in zones_to_skip_lower:
            logger.debug(f"✓ SKIPPING zone '{zone_data['name']}' (found in skip list)")
            continue

        logger.debug(f"→ IMPORTING zone '{zone_data['name']}' (not in skip list)")

        try:
            # Convert GeoJSON to WKT for PostGIS
            wkt = convert_geojson_to_wkt(zone_data['geometry'])

            # Create zone
            zone = Zone(
                project_id=request.project_id,
                name=zone_data['name'],
                description=zone_data.get('description'),
                geometry=WKTElement(wkt, srid=4326),
                color=zone_data.get('color'),
                kml_metadata=zone_data.get('kml_metadata')
            )

            db.add(zone)
            db.flush()  # Flush to get the ID

            created_zones.append(zone)

        except Exception as e:
            errors.append(f"Failed to create zone '{zone_data['name']}': {str(e)}")

    # Commit if we created any zones
    if created_zones:
        db.commit()
    else:
        # No zones created - this is OK if user skipped all duplicates
        # Only raise error if there were actual parsing/processing errors
        if errors:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to import zones. Errors: {'; '.join(errors)}"
            )
        # User skipped all zones - this is a valid operation
        db.rollback()

    # Convert zones to response format
    result_zones = []
    for zone in created_zones:
        zone_dict = {
            "id": zone.id,
            "project_id": zone.project_id,
            "name": zone.name,
            "description": zone.description,
            "geometry": json.loads(db.scalar(zone.geometry.ST_AsGeoJSON())),  # Parse GeoJSON string to dict
            "color": zone.color,
            "kml_metadata": zone.kml_metadata,
            "created_at": zone.created_at,
            "updated_at": zone.updated_at
        }
        result_zones.append(zone_dict)

    logger.info(f"KML import completed: {len(created_zones)} zones created, {len(zones_to_skip)} zones skipped, {len(errors)} errors")

    return {
        "zones_created": len(created_zones),
        "zones": result_zones,
        "errors": errors
    }


@router.delete("/project/{project_id}/all")
async def delete_all_zones(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all zones for a project"""

    # Check project access
    _check_project_access(project_id, current_user, db)

    # Delete all zones for this project
    deleted_count = db.query(Zone).filter(Zone.project_id == project_id).delete()
    db.commit()

    return {"message": f"Deleted {deleted_count} zone(s)", "deleted_count": deleted_count}


@router.delete("/{zone_id}")
async def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a zone"""

    zone = db.query(Zone).filter(Zone.id == zone_id).first()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )

    # Check project access
    _check_project_access(zone.project_id, current_user, db)

    db.delete(zone)
    db.commit()

    return {"message": "Zone deleted successfully"}
