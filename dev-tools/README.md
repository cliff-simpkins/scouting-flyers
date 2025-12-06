# Development Tools

## Quick Start

### Option 1: Auto-Restart (Recommended)
Double-click `watch-backend.bat` to start the backend with automatic restart on code changes.

### Option 2: Manual Restart
Double-click `restart-backend.bat` when you need to restart the backend manually.

## How Auto-Restart Works

The `watch-backend.py` script:
1. Monitors all Python files in `backend/app/`
2. Automatically restarts uvicorn when you save changes
3. Has 2-second debouncing to prevent rapid restarts
4. Shows clear console output for each restart

## Troubleshooting

**Problem:** "Virtual environment Python not found"
- **Solution:** Ensure `backend/venv` exists. Run `python -m venv backend/venv` if needed.

**Problem:** Backend doesn't restart after saving
- **Solution:** Check the watcher console for errors. Ensure you're saving files in `backend/app/`.

**Problem:** Multiple Python processes running
- **Solution:** Run `restart-backend.bat` to kill all and start fresh.

## Files in This Directory

- `restart-backend.bat` - Manual restart script (Tier 1)
- `watch-backend.py` - Auto-restart watcher script (Tier 2)
- `watch-backend.bat` - Launcher for the watcher
- `requirements.txt` - Python dependencies (just watchdog)
- `README.md` - This file

## Benefits

- **Reliable:** Works perfectly on Windows
- **Fast:** < 3 seconds from file save to backend restart
- **Simple:** Minimal dependencies, easy to understand
- **Robust:** Debouncing prevents rapid-fire restarts
- **Integrated:** Works with your existing venv setup
