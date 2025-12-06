-- Enable PostGIS extension for geographical data support
-- Run this script as PostgreSQL superuser on the flyers_db database

\c flyers_db

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS installation
SELECT PostGIS_version();

-- Grant usage on PostGIS spatial reference system table
GRANT ALL ON spatial_ref_sys TO flyers_user;
