-- Migration: Add completion tracking for zone assignments
-- This allows volunteers to mark areas as completed by drawing/clicking on the map

CREATE TABLE IF NOT EXISTS completion_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES zone_assignments(id) ON DELETE CASCADE,
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_completion_areas_assignment_id ON completion_areas(assignment_id);

CREATE INDEX IF NOT EXISTS idx_completion_areas_geometry ON completion_areas USING GIST(geometry);
