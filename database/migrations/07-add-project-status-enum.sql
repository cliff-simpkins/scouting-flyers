-- Add project status enum while maintaining backward compatibility with is_active

-- Create status enum type
CREATE TYPE project_status AS ENUM ('in_progress', 'completed', 'archived');

-- Add status column to projects table (default to in_progress for active projects)
ALTER TABLE projects ADD COLUMN status project_status DEFAULT 'in_progress';

-- Sync existing data: archived if inactive, in_progress if active
UPDATE projects SET status = CASE
    WHEN is_active = false THEN 'archived'::project_status
    ELSE 'in_progress'::project_status
END;

-- Make status non-nullable
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;

-- Create function to keep is_active in sync with status
CREATE OR REPLACE FUNCTION sync_project_active_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is archived, is_active must be false
    -- If status is in_progress or completed, is_active must be true
    NEW.is_active := (NEW.status != 'archived'::project_status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain synchronization
DROP TRIGGER IF EXISTS sync_project_active_trigger ON projects;
CREATE TRIGGER sync_project_active_trigger
    BEFORE INSERT OR UPDATE OF status ON projects
    FOR EACH ROW
    EXECUTE FUNCTION sync_project_active_status();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO flyers_user;

-- Add comments
COMMENT ON COLUMN projects.status IS 'Project workflow status. Kept in sync with is_active via trigger.';
COMMENT ON COLUMN projects.is_active IS 'Legacy boolean. Auto-synced: true for in_progress/completed, false for archived.';
