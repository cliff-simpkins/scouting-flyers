-- Add notes and manual completion percentage to zone_assignments table

-- Add notes column for volunteer zone-level notes
ALTER TABLE zone_assignments ADD COLUMN notes TEXT;

-- Add manual completion percentage column for volunteer override
ALTER TABLE zone_assignments ADD COLUMN manual_completion_percentage INTEGER;

-- Add constraint to ensure percentage is between 0 and 100
ALTER TABLE zone_assignments ADD CONSTRAINT manual_percentage_range
  CHECK (manual_completion_percentage IS NULL OR
         (manual_completion_percentage >= 0 AND manual_completion_percentage <= 100));

-- Grant permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON zone_assignments TO flyers_user;
