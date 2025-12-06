@echo off
REM Build script for custom PostgreSQL image with PostGIS and pgvector

SET IMAGE_NAME=flyers-postgres
SET IMAGE_TAG=17-postgis-pgvector
SET FULL_IMAGE=%IMAGE_NAME%:%IMAGE_TAG%

echo ============================================
echo Building PostgreSQL 17 + PostGIS + pgvector
echo ============================================
echo.
echo Image: %FULL_IMAGE%
echo.

REM Build the image
docker build -t %FULL_IMAGE% .

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo Build completed successfully!
echo ============================================
echo.
echo Image: %FULL_IMAGE%
echo.
echo Next steps:
echo 1. Stop your existing postgres container in Portainer
echo 2. Create new container using image: %FULL_IMAGE%
echo 3. Map port 2775:5432
echo 4. Use same volume as old container
echo 5. Run initialization scripts 02 and 03 in pgAdmin
echo.
pause
