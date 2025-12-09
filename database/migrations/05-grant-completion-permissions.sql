-- Grant permissions on completion_areas table to the app user

-- Grant all permissions on completion_areas table
GRANT SELECT, INSERT, UPDATE, DELETE ON completion_areas TO flyers_user;

-- Grant usage on the sequence (for the id column)
-- Note: Since we're using gen_random_uuid(), we don't need sequence permissions
