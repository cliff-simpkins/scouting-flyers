"""Test database connection"""
import sys
from sqlalchemy import create_engine, text
from app.config import settings

def test_connection():
    """Test database connection and schema"""
    print("Testing database connection...")
    print(f"Database URL: {settings.DATABASE_URL.replace(settings.DATABASE_URL.split(':')[2].split('@')[0], '***')}")

    try:
        # Create engine
        engine = create_engine(settings.DATABASE_URL)

        # Test connection
        with engine.connect() as conn:
            # Test basic query
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"[OK] Connected to PostgreSQL: {version[:50]}...")

            # Test PostGIS
            result = conn.execute(text("SELECT PostGIS_version();"))
            postgis_version = result.fetchone()[0]
            print(f"[OK] PostGIS installed: {postgis_version}")

            # Test tables exist
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"[OK] Found {len(tables)} tables: {', '.join(tables)}")

            # Test views exist
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.views
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            views = [row[0] for row in result.fetchall()]
            print(f"[OK] Found {len(views)} views: {', '.join(views)}")

            print("\n=== Database connection test PASSED! ===")
            return True

    except Exception as e:
        print(f"\n=== Database connection test FAILED! ===")
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
