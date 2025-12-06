-- Add password authentication support to users table
-- Run this as flyers_user on flyers_db database

\c flyers_db

-- Add password_hash column for email/password authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR;

-- Make google_id nullable (for email/password users)
ALTER TABLE users
ALTER COLUMN google_id DROP NOT NULL;

-- Verify changes
\d users
