# Database Setup Guide

This guide explains how to set up the PostgreSQL database with PostGIS extension for the Volunteer Flyer Distribution System.

## Prerequisites

- PostgreSQL 15+ installed and running
- PostgreSQL server accessible at: `192.168.1.11:2775`
- Superuser access to PostgreSQL
- `psql` command-line tool

## Database Overview

- **Database Name:** `flyers_db`
- **Database User:** `flyers_user`
- **Required Extension:** PostGIS (for geospatial data)

## Initial Setup

The database initialization is handled by three SQL scripts in `database/init-scripts/`:

1. `01-create-database.sql` - Creates database and user
2. `02-enable-postgis.sql` - Enables PostGIS extension
3. `03-schema.sql` - Creates all tables, indexes, and views

### Step 1: Create Database and User

Run as PostgreSQL superuser (postgres):

```bash
psql -h 192.168.1.11 -p 2775 -U postgres -f database/init-scripts/01-create-database.sql
```

**Important:** Before running, edit `01-create-database.sql` and replace `YOUR_SECURE_PASSWORD_HERE` with a strong password.

### Step 2: Enable PostGIS

```bash
psql -h 192.168.1.11 -p 2775 -U postgres -d flyers_db -f database/init-scripts/02-enable-postgis.sql
```

### Step 3: Create Schema

```bash
psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db -f database/init-scripts/03-schema.sql
```

You'll need to enter the password you set in Step 1.

### Verify Installation

Connect to the database and verify tables:

```bash
psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db
```

Then run:

```sql
-- Check PostGIS version
SELECT PostGIS_version();

-- List all tables
\dt

-- Expected tables:
-- users, projects, project_collaborators, zones, zone_assignments, houses, house_visits

-- List all views
\dv

-- Expected views:
-- project_stats, zone_progress, volunteer_progress
```

## Database Schema

### Tables

#### users
Stores user information from Google OAuth.

```sql
id            UUID PRIMARY KEY
google_id     VARCHAR(255) UNIQUE
email         VARCHAR(255) UNIQUE
name          VARCHAR(255)
picture_url   TEXT
created_at    TIMESTAMP
updated_at    TIMESTAMP
last_login    TIMESTAMP
```

#### projects
Stores flyer distribution projects.

```sql
id            UUID PRIMARY KEY
name          VARCHAR(255)
description   TEXT
owner_id      UUID → users(id)
is_active     BOOLEAN
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

#### project_collaborators
Manages project collaborators (organizers).

```sql
id            UUID PRIMARY KEY
project_id    UUID → projects(id)
user_id       UUID → users(id)
role          VARCHAR(50) CHECK IN ('owner', 'organizer')
invited_by    UUID → users(id)
invited_at    TIMESTAMP
```

#### zones
Stores geographical zones from KML import.

```sql
id            UUID PRIMARY KEY
project_id    UUID → projects(id)
name          VARCHAR(255)
description   TEXT
geometry      GEOMETRY(Polygon, 4326)  -- PostGIS polygon
color         VARCHAR(7)  -- Hex color
metadata      JSONB
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

#### zone_assignments
Assigns volunteers to zones.

```sql
id              UUID PRIMARY KEY
zone_id         UUID → zones(id)
volunteer_id    UUID → users(id)
assigned_by     UUID → users(id)
assigned_at     TIMESTAMP
status          VARCHAR(50) CHECK IN ('assigned', 'in_progress', 'completed')
started_at      TIMESTAMP
completed_at    TIMESTAMP
```

#### houses
Stores house locations within zones.

```sql
id            UUID PRIMARY KEY
zone_id       UUID → zones(id)
location      GEOMETRY(Point, 4326)  -- PostGIS point
address       TEXT
metadata      JSONB
created_at    TIMESTAMP
```

#### house_visits
Tracks which houses have been visited.

```sql
id                  UUID PRIMARY KEY
house_id            UUID → houses(id)
zone_assignment_id  UUID → zone_assignments(id)
volunteer_id        UUID → users(id)
visited_at          TIMESTAMP
notes               TEXT
offline_sync        BOOLEAN
```

### Views

#### project_stats
Aggregated statistics per project.

```sql
SELECT * FROM project_stats WHERE project_id = 'uuid';

-- Returns:
-- project_id, project_name, total_zones, assigned_zones,
-- total_houses, visited_houses, completion_percentage
```

#### zone_progress
Progress tracking per zone.

```sql
SELECT * FROM zone_progress WHERE project_id = 'uuid';

-- Returns:
-- zone_id, zone_name, project_id, total_houses, visited_houses,
-- completion_percentage, assigned_volunteers[]
```

#### volunteer_progress
Progress tracking per volunteer.

```sql
SELECT * FROM volunteer_progress WHERE project_id = 'uuid';

-- Returns:
-- volunteer_id, volunteer_name, volunteer_email, project_id,
-- zones_assigned, houses_visited, last_visit
```

## Connection String

Use this connection string in your application:

```
postgresql://flyers_user:PASSWORD@192.168.1.11:2775/flyers_db
```

## Migrations

This project uses Alembic for database migrations.

### Initialize Alembic (first time only)

```bash
cd backend
alembic init alembic
```

### Create a migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations

```bash
alembic upgrade head
```

### Rollback migrations

```bash
alembic downgrade -1  # Rollback one migration
alembic downgrade base  # Rollback all migrations
```

## Backup and Restore

### Create Backup

```bash
pg_dump -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db -F c -f backup.dump
```

### Restore Backup

```bash
pg_restore -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db backup.dump
```

### Backup with plain SQL

```bash
pg_dump -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db > backup.sql
```

### Restore from SQL

```bash
psql -h 192.168.1.11 -p 2775 -U flyers_user -d flyers_db < backup.sql
```

## Maintenance

### Vacuum and Analyze

```sql
VACUUM ANALYZE;
```

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('flyers_db'));
```

### Check Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### PostGIS Not Available

If PostGIS is not installed:

```bash
# On Ubuntu/Debian
sudo apt-get install postgresql-15-postgis-3

# On MacOS
brew install postgis
```

### Permission Denied

Ensure `flyers_user` has proper permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE flyers_db TO flyers_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flyers_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flyers_user;
```

### Connection Issues

Check PostgreSQL `pg_hba.conf` allows connections from your IP address.

Add this line:

```
host    flyers_db    flyers_user    0.0.0.0/0    md5
```

Then reload PostgreSQL:

```bash
sudo systemctl reload postgresql
```

## Security Recommendations

1. **Use strong passwords** for database user
2. **Limit connections** to specific IP addresses in `pg_hba.conf`
3. **Enable SSL** for database connections in production
4. **Regular backups** - set up automated backup schedule
5. **Monitor logs** for suspicious activity
6. **Keep PostgreSQL updated** to latest security patches
