@echo off
REM Run all database migrations in order

echo Running database migrations...
echo.

cd backend

echo Running migration: 01-add-password-auth.sql
python run_migration.py ../database/migrations/01-add-password-auth.sql
if errorlevel 1 goto error
echo [32m✓[0m 01-add-password-auth.sql completed successfully
echo.

echo Running migration: 02-add-viewer-role.sql
python run_migration.py ../database/migrations/02-add-viewer-role.sql
if errorlevel 1 goto error
echo [32m✓[0m 02-add-viewer-role.sql completed successfully
echo.

echo Running migration: 03-rename-metadata-columns.sql
python run_migration.py ../database/migrations/03-rename-metadata-columns.sql
if errorlevel 1 goto error
echo [32m✓[0m 03-rename-metadata-columns.sql completed successfully
echo.

echo Running migration: 04-add-completion-tracking.sql
python run_migration.py ../database/migrations/04-add-completion-tracking.sql
if errorlevel 1 goto error
echo [32m✓[0m 04-add-completion-tracking.sql completed successfully
echo.

echo Running migration: 05-grant-completion-permissions.sql
python run_migration.py ../database/migrations/05-grant-completion-permissions.sql
if errorlevel 1 goto error
echo [32m✓[0m 05-grant-completion-permissions.sql completed successfully
echo.

echo Running migration: 06-add-assignment-notes-and-percentage.sql
python run_migration.py ../database/migrations/06-add-assignment-notes-and-percentage.sql
if errorlevel 1 goto error
echo [32m✓[0m 06-add-assignment-notes-and-percentage.sql completed successfully
echo.

echo Running migration: 07-add-project-status-enum.sql
python run_migration.py ../database/migrations/07-add-project-status-enum.sql
if errorlevel 1 goto error
echo [32m✓[0m 07-add-project-status-enum.sql completed successfully
echo.

echo Running migration: 08-add-assignment-notes-table.sql
python run_migration.py ../database/migrations/08-add-assignment-notes-table.sql
if errorlevel 1 goto error
echo [32m✓[0m 08-add-assignment-notes-table.sql completed successfully
echo.

echo [32mAll migrations completed successfully![0m
cd ..
goto end

:error
echo [31m✗ Migration failed[0m
cd ..
exit /b 1

:end
pause
