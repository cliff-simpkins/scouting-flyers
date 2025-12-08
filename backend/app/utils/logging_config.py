"""
Logging configuration for the application.

Sets up separate log files for different log levels:
- info.log: INFO, WARNING, ERROR, CRITICAL
- debug.log: All log levels including DEBUG
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.config import settings


def setup_logging():
    """
    Configure logging with separate files for info and debug levels.

    Creates two log files:
    - logs/info.log: Contains INFO and above (INFO, WARNING, ERROR, CRITICAL)
    - logs/debug.log: Contains all levels including DEBUG

    Both files use rotation to prevent them from growing too large.
    """
    # Create logs directory if it doesn't exist
    log_dir = Path(settings.LOG_DIR)
    log_dir.mkdir(exist_ok=True)

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.LOG_LEVEL == "DEBUG" else settings.LOG_LEVEL)

    # Clear any existing handlers
    root_logger.handlers = []

    # Format for log messages
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler (if enabled)
    if settings.LOG_TO_CONSOLE:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(settings.LOG_LEVEL)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # File handlers (if enabled)
    if settings.LOG_TO_FILE:
        # INFO log file - INFO, WARNING, ERROR, CRITICAL
        info_log_path = log_dir / "info.log"
        info_handler = RotatingFileHandler(
            info_log_path,
            maxBytes=settings.LOG_MAX_BYTES,
            backupCount=settings.LOG_BACKUP_COUNT
        )
        info_handler.setLevel(logging.INFO)
        info_handler.setFormatter(formatter)
        root_logger.addHandler(info_handler)

        # DEBUG log file - All levels including DEBUG
        debug_log_path = log_dir / "debug.log"
        debug_handler = RotatingFileHandler(
            debug_log_path,
            maxBytes=settings.LOG_MAX_BYTES,
            backupCount=settings.LOG_BACKUP_COUNT
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.setFormatter(formatter)
        root_logger.addHandler(debug_handler)

    # Log the initialization
    logging.info(f"Logging initialized - Level: {settings.LOG_LEVEL}, File: {settings.LOG_TO_FILE}, Console: {settings.LOG_TO_CONSOLE}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.

    Args:
        name: Name for the logger (typically __name__ of the module)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
