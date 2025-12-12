#!/bin/bash
# Run all database migrations in order

set -e  # Exit on error

echo "Running database migrations..."
echo

cd backend

migrations=(
    "01-add-password-auth.sql"
    "02-add-viewer-role.sql"
    "03-rename-metadata-columns.sql"
    "04-add-completion-tracking.sql"
    "05-grant-completion-permissions.sql"
    "06-add-assignment-notes-and-percentage.sql"
    "07-add-project-status-enum.sql"
    "08-add-assignment-notes-table.sql"
)

for migration in "${migrations[@]}"; do
    echo "Running migration: $migration"
    python run_migration.py "../database/migrations/$migration"
    if [ $? -eq 0 ]; then
        echo "✓ $migration completed successfully"
    else
        echo "✗ $migration failed"
        exit 1
    fi
    echo
done

echo "All migrations completed successfully!"
