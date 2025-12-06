#!/bin/bash
# Build script for custom PostgreSQL image with PostGIS and pgvector

set -e

IMAGE_NAME="flyers-postgres"
IMAGE_TAG="17-postgis-pgvector"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "============================================"
echo "Building PostgreSQL 17 + PostGIS + pgvector"
echo "============================================"
echo ""
echo "Image: ${FULL_IMAGE}"
echo ""

# Build the image
docker build -t "${FULL_IMAGE}" .

echo ""
echo "============================================"
echo "Build completed successfully!"
echo "============================================"
echo ""
echo "Image: ${FULL_IMAGE}"
echo ""
echo "Next steps:"
echo "1. Stop your existing postgres container in Portainer"
echo "2. Create new container using image: ${FULL_IMAGE}"
echo "3. Map port 2775:5432"
echo "4. Use same volume as old container"
echo "5. Run initialization scripts 02 and 03 in pgAdmin"
echo ""
