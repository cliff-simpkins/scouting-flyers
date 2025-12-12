@echo off
REM Comprehensive Docker Deployment Test Script for Windows
REM Tests all critical endpoints and verifies the deployment is working

setlocal enabledelayedexpansion

REM Configuration
set BACKEND_URL=http://localhost:8000
set FRONTEND_URL=http://localhost:80

echo =========================================
echo   Docker Deployment Test Suite
echo =========================================
echo.
echo Backend URL: %BACKEND_URL%
echo Frontend URL: %FRONTEND_URL%
echo.

REM Test counters
set PASSED=0
set FAILED=0
set WARNINGS=0

echo =========================================
echo 1. Container Status Checks
echo =========================================
echo.

REM Check if containers are running
docker ps --format "{{.Names}}" | findstr /C:"flyers-backend" >nul
if !errorlevel! == 0 (
    echo [32m✓[0m flyers-backend: running
    set /a PASSED+=1
) else (
    echo [31m✗[0m flyers-backend: not found
    set /a FAILED+=1
)

docker ps --format "{{.Names}}" | findstr /C:"flyers-frontend" >nul
if !errorlevel! == 0 (
    echo [32m✓[0m flyers-frontend: running
    set /a PASSED+=1
) else (
    echo [31m✗[0m flyers-frontend: not found
    set /a FAILED+=1
)

docker ps --format "{{.Names}}" | findstr /C:"flyers-nginx" >nul
if !errorlevel! == 0 (
    echo [32m✓[0m flyers-nginx: running
    set /a PASSED+=1
) else (
    echo [31m✗[0m flyers-nginx: not found
    set /a FAILED+=1
)

echo.
echo =========================================
echo 2. Health Check Endpoints
echo =========================================
echo.

REM Test health endpoints
echo Testing Liveness check...
curl -s -f %BACKEND_URL%/health >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Liveness check
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Liveness check
    set /a FAILED+=1
)

echo Testing Readiness check...
curl -s -f %BACKEND_URL%/health/ready >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Readiness check
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Readiness check
    set /a FAILED+=1
)

echo Testing Detailed health...
curl -s -f %BACKEND_URL%/health/detailed >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Detailed health
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Detailed health
    set /a FAILED+=1
)

echo Testing Startup check...
curl -s -f %BACKEND_URL%/health/startup >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Startup check
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Startup check
    set /a FAILED+=1
)

echo Testing Metrics endpoint...
curl -s -f %BACKEND_URL%/metrics >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Metrics endpoint
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Metrics endpoint
    set /a FAILED+=1
)

echo.
echo =========================================
echo 3. API Endpoints
echo =========================================
echo.

echo Testing Root endpoint...
curl -s -f %BACKEND_URL%/ >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Root endpoint
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Root endpoint
    set /a FAILED+=1
)

echo Testing API docs...
curl -s -f %BACKEND_URL%/api/v1/docs >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m API docs
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m API docs
    set /a FAILED+=1
)

echo Testing OpenAPI spec...
curl -s -f %BACKEND_URL%/api/v1/openapi.json >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m OpenAPI spec
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m OpenAPI spec
    set /a FAILED+=1
)

echo.
echo =========================================
echo 4. Frontend Tests
echo =========================================
echo.

echo Testing Frontend root...
curl -s -f %FRONTEND_URL%/ >nul 2>&1
if !errorlevel! == 0 (
    echo [32m✓ PASSED[0m Frontend root
    set /a PASSED+=1
) else (
    echo [31m✗ FAILED[0m Frontend root
    set /a FAILED+=1
)

echo.
echo =========================================
echo Test Summary
echo =========================================
echo.
echo [32mPassed:[0m   !PASSED!
echo [31mFailed:[0m   !FAILED!
echo [33mWarnings:[0m !WARNINGS!
echo.

if !FAILED! == 0 (
    echo [32m✓ All critical tests passed![0m
    exit /b 0
) else (
    echo [31m✗ Some tests failed. Please review the output above.[0m
    exit /b 1
)
