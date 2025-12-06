-- Migration 03: Rename metadata columns to avoid SQLAlchemy reserved names
-- Date: 2025-12-06
-- Description: Renames 'metadata' to 'kml_metadata' in zones table and 'metadata' to 'house_metadata' in houses table

-- Rename metadata column in zones table
ALTER TABLE zones
RENAME COLUMN metadata TO kml_metadata;

-- Rename metadata column in houses table (if it exists)
ALTER TABLE houses
RENAME COLUMN metadata TO house_metadata;
