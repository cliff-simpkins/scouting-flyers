# Database Setup Guide

This directory contains the custom PostgreSQL Docker image with PostGIS and pgvector extensions, plus initialization scripts.

## Quick Start

### Option A: Build and Deploy via Portainer

1. **Build the Docker image:**
   ```bash
   cd database
   docker build -t flyers-postgres:17-postgis-pgvector .
   ```

2. **In Portainer:**
   - Stop your existing `postgres:17` container
   - Create new container:
     - **Image:** `flyers-postgres:17-postgis-pgvector`
     - **Name:** `postgres-postgis-pgvector`
     - **Port mapping:** `2775:5432`
     - **Volumes:** Use the same volume as your old container → `/var/lib/postgresql/data`
     - **Environment variables:**
       - `POSTGRES_PASSWORD=<your_postgres_superuser_password>`
   - Start the container

3. **Run initialization scripts in pgAdmin:**
   - Script 1: `01-create-database.sql` (already completed ✓)
   - Script 2: `02-enable-postgis.sql` (enables PostGIS + pgvector)
   - Script 3: `03-schema.sql` (creates all tables and indexes)

### Option B: Build via Command Line

```bash
# Navigate to database directory
cd database

# Build the image
docker build -t flyers-postgres:17-postgis-pgvector .

# Stop old container
docker stop <your_old_postgres_container>

# Run new container (replace <volume_name> and <password>)
docker run -d \
  --name postgres-postgis-pgvector \
  -p 2775:5432 \
  -e POSTGRES_PASSWORD=<your_postgres_password> \
  -v <volume_name>:/var/lib/postgresql/data \
  flyers-postgres:17-postgis-pgvector

# Container should now be running with both PostGIS and pgvector!
```

## What's Included

This custom Docker image includes:
- **PostgreSQL 17** - Latest stable PostgreSQL
- **PostGIS 3.4** - Geographic objects and spatial queries
- **pgvector 0.7.4** - Vector similarity search for AI/ML features

## Database Initialization Scripts

Run these scripts in order after the container is running:

### 1. `01-create-database.sql` ✓ (Already completed)
Creates:
- Database user: `flyers_user`
- Database: `flyers_db`
- Grants appropriate permissions

### 2. `02-enable-postgis.sql`
Enables:
- PostGIS extension (for zones and houses geospatial data)
- pgvector extension (for future AI features)

**Run as:** `postgres` superuser
**On database:** `flyers_db`

### 3. `03-schema.sql`
Creates all tables:
- `users` - User accounts (Google OAuth)
- `projects` - Flyer distribution projects
- `project_collaborators` - Project team members
- `zones` - Geographic zones (with PostGIS geometry)
- `zone_assignments` - Volunteer zone assignments
- `houses` - Individual houses (with PostGIS point locations)
- `house_visits` - Visit tracking records

Plus indexes, views, and triggers.

**Run as:** `flyers_user`
**On database:** `flyers_db`

## Connection Details

After setup, your backend application will connect using:

```
Host: 192.168.1.11
Port: 2775
Database: flyers_db
User: flyers_user
Password: x1ONQ71pb_vRMbarHtd7Z8b39uSW3_LF
```

## Verification

After running all scripts, verify the setup:

```sql
-- Check installed extensions
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'vector');

-- Check PostGIS version
SELECT PostGIS_version();

-- Check pgvector is available
SELECT vector_version();

-- List all tables
\dt
```

## Troubleshooting

**Problem:** "extension postgis is not available"
**Solution:** Make sure you're using the custom Docker image, not the plain `postgres:17`

**Problem:** "permission denied for schema public"
**Solution:** Run script 1 again to grant permissions, or manually:
```sql
GRANT ALL ON SCHEMA public TO flyers_user;
```

**Problem:** Cannot connect to database
**Solution:** Check that port 2775 is mapped correctly and container is running

## Future: Adding More Extensions

To add additional PostgreSQL extensions, edit `Dockerfile` and add installation commands before the cleanup step.
