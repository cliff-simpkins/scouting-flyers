@echo off
echo ============================================
echo  Backend Restart Utility
echo ============================================
echo.

echo [1/3] Stopping all Python processes...
taskkill /F /IM python.exe /T >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo √ Backend stopped
) else (
    echo ¡ No backend process was running
)

echo.
echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting backend...
cd /d "%~dp0..\backend"
start "Backend Server" cmd /k "venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo √ Backend restarted successfully!
echo   Check the new window for server output
echo.
pause
