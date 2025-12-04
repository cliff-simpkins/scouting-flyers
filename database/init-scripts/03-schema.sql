-- Database schema for Volunteer Flyer Distribution System
-- Run this script as flyers_user on the flyers_db database

\c flyers_db

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (authenticated via Google OAuth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);

-- Project collaborators (organizers who can manage the project)
CREATE TABLE project_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'organizer')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON project_collaborators(user_id);

-- Zones table (from KML import)
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,  -- PostGIS for polygon storage (WGS 84)
    color VARCHAR(7),  -- Hex color from KML (e.g., #FF5733)
    metadata JSONB,  -- Additional KML metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_project_id ON zones(project_id);
CREATE INDEX idx_zones_geometry ON zones USING GIST(geometry);

-- Zone assignments (volunteers assigned to zones)
CREATE TABLE zone_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_zone_assignments_zone_id ON zone_assignments(zone_id);
CREATE INDEX idx_zone_assignments_volunteer_id ON zone_assignments(volunteer_id);
CREATE INDEX idx_zone_assignments_status ON zone_assignments(status);

-- Houses table (generated from zone geometry or manually added)
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,  -- House coordinate (WGS 84)
    address TEXT,  -- Optional address (from reverse geocoding or OSM)
    metadata JSONB,  -- Additional data (building type, OSM tags, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_houses_zone_id ON houses(zone_id);
CREATE INDEX idx_houses_location ON houses USING GIST(location);

-- House visits (tracking which houses have been visited)
CREATE TABLE house_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    zone_assignment_id UUID NOT NULL REFERENCES zone_assignments(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    offline_sync BOOLEAN DEFAULT FALSE,  -- Marked if synced from offline storage
    UNIQUE(house_id, zone_assignment_id)
);

CREATE INDEX idx_house_visits_house_id ON house_visits(house_id);
CREATE INDEX idx_house_visits_zone_assignment_id ON house_visits(zone_assignment_id);
CREATE INDEX idx_house_visits_volunteer_id ON house_visits(volunteer_id);
CREATE INDEX idx_house_visits_visited_at ON house_visits(visited_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    COUNT(DISTINCT z.id) AS total_zones,
    COUNT(DISTINCT za.id) AS assigned_zones,
    COUNT(DISTINCT h.id) AS total_houses,
    COUNT(DISTINCT hv.id) AS visited_houses,
    CASE
        WHEN COUNT(DISTINCT h.id) > 0
        THEN ROUND((COUNT(DISTINCT hv.id)::NUMERIC / COUNT(DISTINCT h.id) * 100), 2)
        ELSE 0
    END AS completion_percentage
FROM projects p
LEFT JOIN zones z ON p.id = z.project_id
LEFT JOIN zone_assignments za ON z.id = za.zone_id
LEFT JOIN houses h ON z.id = h.zone_id
LEFT JOIN house_visits hv ON h.id = hv.house_id
GROUP BY p.id, p.name;

-- Create view for zone progress
CREATE OR REPLACE VIEW zone_progress AS
SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    z.project_id,
    COUNT(DISTINCT h.id) AS total_houses,
    COUNT(DISTINCT hv.id) AS visited_houses,
    CASE
        WHEN COUNT(DISTINCT h.id) > 0
        THEN ROUND((COUNT(DISTINCT hv.id)::NUMERIC / COUNT(DISTINCT h.id) * 100), 2)
        ELSE 0
    END AS completion_percentage,
    ARRAY_AGG(DISTINCT za.volunteer_id) FILTER (WHERE za.volunteer_id IS NOT NULL) AS assigned_volunteers
FROM zones z
LEFT JOIN houses h ON z.id = h.zone_id
LEFT JOIN house_visits hv ON h.id = hv.house_id
LEFT JOIN zone_assignments za ON z.id = za.zone_id
GROUP BY z.id, z.name, z.project_id;

-- Create view for volunteer progress
CREATE OR REPLACE VIEW volunteer_progress AS
SELECT
    u.id AS volunteer_id,
    u.name AS volunteer_name,
    u.email AS volunteer_email,
    za.project_id,
    COUNT(DISTINCT za.zone_id) AS zones_assigned,
    COUNT(DISTINCT hv.id) AS houses_visited,
    MAX(hv.visited_at) AS last_visit
FROM users u
JOIN zone_assignments za ON u.id = za.volunteer_id
LEFT JOIN house_visits hv ON za.id = hv.zone_assignment_id
JOIN zones z ON za.zone_id = z.id
GROUP BY u.id, u.name, u.email, za.project_id;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flyers_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flyers_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO flyers_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables: users, projects, project_collaborators, zones, zone_assignments, houses, house_visits';
    RAISE NOTICE 'Views: project_stats, zone_progress, volunteer_progress';
END $$;
