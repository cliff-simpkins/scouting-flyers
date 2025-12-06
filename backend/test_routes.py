"""Test script to debug zones router registration"""
import sys
import traceback

try:
    print("1. Importing app.main...")
    from app.main import app
    print("   OK app.main imported")

    print("\n2. Importing app.routers.zones...")
    from app.routers import zones
    print(f"   OK zones module: {zones}")
    print(f"   OK zones.router: {zones.router}")
    print(f"   OK zones.router.prefix: {zones.router.prefix}")

    print("\n3. Checking app routes...")
    all_routes = [r.path for r in app.routes]
    zone_routes = [r for r in all_routes if 'zone' in r.lower()]

    print(f"   Total routes: {len(all_routes)}")
    print(f"   Zone routes: {len(zone_routes)}")

    if zone_routes:
        print("\n4. Zone routes found:")
        for route in zone_routes:
            print(f"   - {route}")
    else:
        print("\n4. NO ZONE ROUTES FOUND!")
        print("\n   All routes:")
        for route in all_routes:
            print(f"   - {route}")

except Exception as e:
    print(f"\nERROR: {e}")
    traceback.print_exc()
