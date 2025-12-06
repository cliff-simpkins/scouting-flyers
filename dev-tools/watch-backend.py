#!/usr/bin/env python3
"""
Backend Auto-Restart Watcher
Monitors backend code and automatically restarts uvicorn when changes are detected.
"""
import os
import sys
import time
import subprocess
import signal
import re
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


def kill_processes_on_port(port=8000):
    """Kill any processes listening on the specified port."""
    try:
        # Use netstat to find processes on port
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return

        # Parse netstat output to find PIDs listening on port
        pids = set()
        for line in result.stdout.split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                # Extract PID (last column)
                parts = line.split()
                if parts:
                    try:
                        pid = int(parts[-1])
                        pids.add(pid)
                    except (ValueError, IndexError):
                        continue

        # Kill each process
        if pids:
            print(f"\nKilling {len(pids)} process(es) on port {port}...")
            for pid in pids:
                try:
                    subprocess.run(
                        ['taskkill', '/F', '/PID', str(pid)],
                        capture_output=True,
                        timeout=5
                    )
                    print(f"  Killed PID {pid}")
                except Exception as e:
                    print(f"  Could not kill PID {pid}: {e}")
            print()
    except Exception as e:
        print(f"Warning: Could not kill processes on port {port}: {e}")


class BackendRestartHandler(FileSystemEventHandler):
    """Handles file system events and restarts the backend."""

    def __init__(self, backend_dir, venv_python):
        self.backend_dir = backend_dir
        self.venv_python = venv_python
        self.process = None
        self.restart_pending = False
        self.last_restart_time = 0
        self.debounce_seconds = 2  # Wait 2s between restarts

    def start_backend(self):
        """Start the backend server."""
        if self.process:
            self.stop_backend()

        # Kill any stale processes on port 8000
        kill_processes_on_port(8000)

        print("\n" + "="*60)
        print(f"Starting backend server...")
        print("="*60)

        cmd = [
            str(self.venv_python),
            "-m", "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000"
            # No --reload flag - we handle restarts manually
        ]

        self.process = subprocess.Popen(
            cmd,
            cwd=str(self.backend_dir),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
        print(f"Backend started (PID: {self.process.pid})")
        print("="*60 + "\n")

    def stop_backend(self):
        """Stop the backend server gracefully."""
        if self.process:
            print("\nStopping backend...")
            try:
                self.process.send_signal(signal.CTRL_BREAK_EVENT)
                self.process.wait(timeout=5)
            except:
                self.process.kill()
            self.process = None
            print("Backend stopped\n")

    def restart_backend(self):
        """Restart the backend server with debouncing."""
        current_time = time.time()

        # Debounce: don't restart too frequently
        if current_time - self.last_restart_time < self.debounce_seconds:
            self.restart_pending = True
            return

        self.last_restart_time = current_time
        self.restart_pending = False

        print("\n" + "~"*60)
        print("Code changes detected - restarting backend...")
        print("~"*60)

        self.start_backend()

    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return

        # Only restart for Python files
        if event.src_path.endswith('.py'):
            print(f"Changed: {Path(event.src_path).name}")
            self.restart_backend()

def main():
    """Main entry point."""
    # Determine paths
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent
    backend_dir = project_root / "backend"
    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"

    # Validate paths
    if not backend_dir.exists():
        print(f"Error: Backend directory not found: {backend_dir}")
        sys.exit(1)

    if not venv_python.exists():
        print(f"Error: Virtual environment Python not found: {venv_python}")
        print("   Please create a virtual environment in backend/venv first")
        sys.exit(1)

    print("="*60)
    print("  Backend Auto-Restart Watcher")
    print("="*60)
    print(f"Backend directory: {backend_dir}")
    print(f"Python: {venv_python}")
    print(f"Watching: {backend_dir / 'app'}")
    print("="*60)
    print("\nTip: Save any .py file in backend/app to trigger restart")
    print("   Press Ctrl+C to stop\n")

    # Create handler and observer
    handler = BackendRestartHandler(backend_dir, venv_python)
    observer = Observer()
    observer.schedule(handler, str(backend_dir / "app"), recursive=True)

    # Start initial backend
    handler.start_backend()

    # Start watching
    observer.start()

    try:
        while True:
            time.sleep(1)
            # Process pending restart if debounce period has passed
            if handler.restart_pending:
                current_time = time.time()
                if current_time - handler.last_restart_time >= handler.debounce_seconds:
                    handler.restart_backend()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        observer.stop()
        handler.stop_backend()

    observer.join()
    print("Watcher stopped\n")

if __name__ == "__main__":
    main()
