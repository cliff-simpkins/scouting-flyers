from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    print("Renaming zones.metadata to zones.kml_metadata...")
    conn.execute(text("ALTER TABLE zones RENAME COLUMN metadata TO kml_metadata"))
    conn.commit()
    print("SUCCESS: zones.metadata renamed to kml_metadata")

    try:
        print("\nRenaming houses.metadata to houses.house_metadata...")
        conn.execute(text("ALTER TABLE houses RENAME COLUMN metadata TO house_metadata"))
        conn.commit()
        print("SUCCESS: houses.metadata renamed to house_metadata")
    except Exception as e:
        print(f"Note: houses table might not exist yet: {e}")
