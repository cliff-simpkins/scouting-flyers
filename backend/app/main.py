"""Main FastAPI application"""
# Updated: Added notes and manual_completion_percentage to zone assignments
import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.utils.logging_config import setup_logging

# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)

# Track server start time
SERVER_START_TIME = datetime.utcnow()
logger.info(f"Server starting at {SERVER_START_TIME.isoformat()}")

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API for managing volunteer flyer distribution",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Volunteer Flyer Distribution API",
        "version": settings.APP_VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


# API routers
from app.routers import auth, projects, zones, assignments, completions, assignment_notes, health

# Health check endpoints (no API prefix for container orchestration)
app.include_router(health.router)

# API v1 routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["auth"])
app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(zones.router, prefix=settings.API_V1_PREFIX)
app.include_router(assignments.router, prefix=settings.API_V1_PREFIX)
app.include_router(completions.router, prefix=settings.API_V1_PREFIX)
app.include_router(assignment_notes.router, prefix=settings.API_V1_PREFIX)

# To be added:
# from app.routers import houses
# app.include_router(houses.router, prefix=settings.API_V1_PREFIX, tags=["houses"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
