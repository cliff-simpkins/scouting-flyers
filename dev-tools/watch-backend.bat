@echo off
cd /d "%~dp0"

REM Check if watchdog is installed
python -c "import watchdog" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing watchdog package...
    pip install -r requirements.txt
)

REM Run the watcher
python watch-backend.py
