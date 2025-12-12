"""Health check endpoints for monitoring and container orchestration"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.config import settings

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_liveness():
    """
    Liveness probe - Returns 200 if server is running
    Used by container orchestrators to determine if container should be restarted
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def health_readiness(db: Session = Depends(get_db)):
    """
    Readiness probe - Returns 200 if server is ready to accept traffic
    Checks database connectivity and critical dependencies
    Used by load balancers to determine if traffic should be routed
    """
    checks = {
        "database": False,
        "postgis": False
    }

    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        checks["database"] = True

        # Check PostGIS extension
        result = db.execute(text("SELECT PostGIS_version()"))
        postgis_version = result.scalar()
        checks["postgis"] = True
        checks["postgis_version"] = postgis_version

    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "checks": checks,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

    if all(checks.values()):
        return {
            "status": "ready",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        return {
            "status": "not_ready",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/health/detailed", status_code=status.HTTP_200_OK)
async def health_detailed(db: Session = Depends(get_db)):
    """
    Detailed health check with all system components
    Provides comprehensive status for monitoring dashboards
    """
    # Import here to avoid circular dependency
    from app.main import SERVER_START_TIME

    health_data: Dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "uptime_seconds": (datetime.utcnow() - SERVER_START_TIME).total_seconds(),
        "start_time": SERVER_START_TIME.isoformat(),
        "components": {}
    }

    # Check API component
    health_data["components"]["api"] = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "debug_mode": settings.DEBUG
    }

    # Check database
    try:
        db.execute(text("SELECT 1"))

        # Get database version
        db_version_result = db.execute(text("SELECT version()"))
        db_version = db_version_result.scalar()

        # Get PostGIS version
        postgis_result = db.execute(text("SELECT PostGIS_version()"))
        postgis_version = postgis_result.scalar()

        # Get pgvector version if available
        try:
            pgvector_result = db.execute(text("SELECT extversion FROM pg_extension WHERE extname = 'vector'"))
            pgvector_version = pgvector_result.scalar()
        except:
            pgvector_version = None

        # Count total records in key tables
        try:
            users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
            projects_count = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
            zones_count = db.execute(text("SELECT COUNT(*) FROM zones")).scalar()
            assignments_count = db.execute(text("SELECT COUNT(*) FROM zone_assignments")).scalar()
        except:
            users_count = projects_count = zones_count = assignments_count = None

        health_data["components"]["database"] = {
            "status": "healthy",
            "connected": True,
            "version": db_version.split('\n')[0] if db_version else "unknown",
            "postgis_version": postgis_version,
            "pgvector_version": pgvector_version,
            "stats": {
                "users": users_count,
                "projects": projects_count,
                "zones": zones_count,
                "assignments": assignments_count
            }
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_data["components"]["database"] = {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }
        health_data["status"] = "unhealthy"

    # Check authentication configuration
    auth_configured = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)
    health_data["components"]["authentication"] = {
        "status": "healthy" if auth_configured else "warning",
        "google_oauth_configured": auth_configured,
        "jwt_algorithm": settings.JWT_ALGORITHM
    }

    # Check CORS configuration
    health_data["components"]["cors"] = {
        "status": "healthy",
        "allowed_origins": settings.cors_origins_list
    }

    return health_data


@router.get("/health/startup", status_code=status.HTTP_200_OK)
async def health_startup(db: Session = Depends(get_db)):
    """
    Startup probe - Checks if application has fully initialized
    Used by container orchestrators during application startup
    """
    try:
        # Verify database connection
        db.execute(text("SELECT 1"))

        # Verify critical tables exist
        tables_to_check = ["users", "projects", "zones", "zone_assignments"]
        for table in tables_to_check:
            db.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))

        return {
            "status": "started",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Application has successfully started"
        }
    except Exception as e:
        logger.error(f"Startup check failed: {e}")
        return {
            "status": "starting",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "message": "Application is still starting up"
        }


@router.get("/metrics", status_code=status.HTTP_200_OK)
async def metrics(db: Session = Depends(get_db)):
    """
    Prometheus-compatible metrics endpoint
    Returns basic metrics in a format that Prometheus can scrape
    """
    try:
        # Import here to avoid circular dependency
        from app.main import SERVER_START_TIME

        # Get uptime
        uptime = (datetime.utcnow() - SERVER_START_TIME).total_seconds()

        # Get database stats
        users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        projects_count = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
        zones_count = db.execute(text("SELECT COUNT(*) FROM zones")).scalar()
        assignments_count = db.execute(text("SELECT COUNT(*) FROM zone_assignments")).scalar()

        # Get assignment status breakdown
        assigned_count = db.execute(text("SELECT COUNT(*) FROM zone_assignments WHERE status = 'assigned'")).scalar()
        in_progress_count = db.execute(text("SELECT COUNT(*) FROM zone_assignments WHERE status = 'in_progress'")).scalar()
        completed_count = db.execute(text("SELECT COUNT(*) FROM zone_assignments WHERE status = 'completed'")).scalar()

        # Return Prometheus-style metrics
        metrics_text = f"""# HELP flyers_uptime_seconds Application uptime in seconds
# TYPE flyers_uptime_seconds gauge
flyers_uptime_seconds {uptime}

# HELP flyers_users_total Total number of users
# TYPE flyers_users_total gauge
flyers_users_total {users_count}

# HELP flyers_projects_total Total number of projects
# TYPE flyers_projects_total gauge
flyers_projects_total {projects_count}

# HELP flyers_zones_total Total number of zones
# TYPE flyers_zones_total gauge
flyers_zones_total {zones_count}

# HELP flyers_assignments_total Total number of zone assignments
# TYPE flyers_assignments_total gauge
flyers_assignments_total {assignments_count}

# HELP flyers_assignments_by_status Number of assignments by status
# TYPE flyers_assignments_by_status gauge
flyers_assignments_by_status{{status="assigned"}} {assigned_count}
flyers_assignments_by_status{{status="in_progress"}} {in_progress_count}
flyers_assignments_by_status{{status="completed"}} {completed_count}
"""
        return metrics_text
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return f"# Error collecting metrics: {str(e)}"
