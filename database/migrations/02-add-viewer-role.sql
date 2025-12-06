-- Migration: Add 'viewer' role to project_collaborators
-- Date: 2025-12-05
-- Description: Updates the role check constraint to include the 'viewer' role

\c flyers_db

-- Drop the existing check constraint
ALTER TABLE project_collaborators
DROP CONSTRAINT IF EXISTS project_collaborators_role_check;

-- Add new check constraint with 'viewer' included
ALTER TABLE project_collaborators
ADD CONSTRAINT project_collaborators_role_check
CHECK (role IN ('owner', 'organizer', 'viewer'));

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: viewer role added to project_collaborators table';
END $$;
