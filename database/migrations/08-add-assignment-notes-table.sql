-- Create assignment_notes table to replace single notes TEXT column
-- Allows multiple notes per assignment with author attribution and timestamps

CREATE TABLE IF NOT EXISTS assignment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES zone_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_notes_assignment_id ON assignment_notes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notes_user_id ON assignment_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notes_created_at ON assignment_notes(created_at DESC);

-- Migrate existing notes from zone_assignments.notes column
-- Attribute them to the volunteer (assignment.volunteer_id)
INSERT INTO assignment_notes (assignment_id, user_id, content, created_at, updated_at)
SELECT
    id as assignment_id,
    volunteer_id as user_id,
    notes as content,
    assigned_at as created_at,
    assigned_at as updated_at
FROM zone_assignments
WHERE notes IS NOT NULL AND notes != '';

-- Mark old column as deprecated (keep for backward compatibility)
COMMENT ON COLUMN zone_assignments.notes IS 'DEPRECATED: Use assignment_notes table instead. Kept for backward compatibility.';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_notes TO flyers_user;

-- Auto-update updated_at timestamp on modification
CREATE OR REPLACE FUNCTION update_assignment_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignment_note_timestamp_trigger
    BEFORE UPDATE ON assignment_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_assignment_note_timestamp();
