-- Database initialization script for Volunteer Flyer Distribution System
-- Run this script as PostgreSQL superuser (postgres)

-- Create database user
CREATE USER flyers_user WITH PASSWORD 'x1ONQ71pb_vRMbarHtd7Z8b39uSW3_LF';

-- Create database
CREATE DATABASE flyers_db
    WITH
    OWNER = flyers_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE flyers_db TO flyers_user;

-- Connect to the new database
\c flyers_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO flyers_user;
