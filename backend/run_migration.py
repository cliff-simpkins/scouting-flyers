#!/usr/bin/env python3
"""Run database migration"""
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from app.config import settings

def run_migration(migration_file: str):
    """Run a SQL migration file"""
    # Read migration file
    migration_path = Path(__file__).parent.parent / "database" / "migrations" / migration_file

    if not migration_path.exists():
        print(f"Error: Migration file not found: {migration_path}")
        sys.exit(1)

    with open(migration_path, 'r') as f:
        sql = f.read()

    # Create database engine
    engine = create_engine(settings.DATABASE_URL)

    # Execute migration
    print(f"Running migration: {migration_file}")
    print("-" * 60)

    try:
        with engine.connect() as conn:
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]

            for statement in statements:
                if statement:
                    print(f"Executing: {statement[:100]}...")
                    conn.execute(text(statement))
                    conn.commit()

        print("-" * 60)
        print("SUCCESS: Migration completed successfully!")

    except Exception as e:
        print("-" * 60)
        print(f"ERROR: Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_migration.py <migration_file>")
        print("Example: python run_migration.py 03-rename-metadata-columns.sql")
        sys.exit(1)

    run_migration(sys.argv[1])
