#!/bin/bash
# Comprehensive Docker Deployment Test Script
# Tests all critical endpoints and verifies the deployment is working

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:80}"

echo "========================================="
echo "  Docker Deployment Test Suite"
echo "========================================="
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test counter
PASSED=0
FAILED=0
WARNINGS=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Helper function to check JSON response
test_json_field() {
    local name=$1
    local url=$2
    local field=$3
    local expected=$4

    echo -n "Testing $name... "

    response=$(curl -s "$url" 2>/dev/null)

    if command -v jq &> /dev/null; then
        actual=$(echo "$response" | jq -r ".$field" 2>/dev/null)
        if [ "$actual" = "$expected" ]; then
            echo -e "${GREEN}✓ PASSED${NC} ($field = $expected)"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED${NC} (Expected $expected, got $actual)"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC} (jq not installed)"
        WARNINGS=$((WARNINGS + 1))
        return 0
    fi
}

echo "========================================="
echo "1. Container Status Checks"
echo "========================================="
echo ""

# Check if containers are running
if command -v docker &> /dev/null; then
    echo "Checking container status..."

    containers=("flyers-backend" "flyers-frontend" "flyers-nginx")
    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            status=$(docker inspect -f '{{.State.Status}}' "$container")
            health=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

            if [ "$status" = "running" ]; then
                if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                    echo -e "  ${GREEN}✓${NC} $container: $status ($health)"
                    PASSED=$((PASSED + 1))
                else
                    echo -e "  ${RED}✗${NC} $container: $status ($health)"
                    FAILED=$((FAILED + 1))
                fi
            else
                echo -e "  ${RED}✗${NC} $container: $status"
                FAILED=$((FAILED + 1))
            fi
        else
            echo -e "  ${RED}✗${NC} $container: not found"
            FAILED=$((FAILED + 1))
        fi
    done
else
    echo -e "${YELLOW}⚠ Docker not available, skipping container checks${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "2. Health Check Endpoints"
echo "========================================="
echo ""

# Test health endpoints
test_endpoint "Liveness check" "$BACKEND_URL/health"
test_endpoint "Readiness check" "$BACKEND_URL/health/ready"
test_endpoint "Detailed health" "$BACKEND_URL/health/detailed"
test_endpoint "Startup check" "$BACKEND_URL/health/startup"
test_endpoint "Metrics endpoint" "$BACKEND_URL/metrics"

echo ""
echo "========================================="
echo "3. API Endpoints"
echo "========================================="
echo ""

# Test API endpoints
test_endpoint "Root endpoint" "$BACKEND_URL/"
test_endpoint "API docs" "$BACKEND_URL/api/v1/docs"
test_endpoint "OpenAPI spec" "$BACKEND_URL/api/v1/openapi.json"

echo ""
echo "========================================="
echo "4. Health Check Response Validation"
echo "========================================="
echo ""

# Validate health check responses
test_json_field "Health status field" "$BACKEND_URL/health" "status" "healthy"
test_json_field "Readiness status field" "$BACKEND_URL/health/ready" "status" "ready"
test_json_field "Detailed version field" "$BACKEND_URL/health/detailed" "version" "1.0.0"

echo ""
echo "========================================="
echo "5. Frontend Tests"
echo "========================================="
echo ""

# Test frontend
test_endpoint "Frontend root" "$FRONTEND_URL/" 200

echo ""
echo "========================================="
echo "6. Database Connectivity"
echo "========================================="
echo ""

# Test database through readiness check
echo -n "Testing database connectivity... "
response=$(curl -s "$BACKEND_URL/health/ready")

if command -v jq &> /dev/null; then
    db_status=$(echo "$response" | jq -r '.checks.database' 2>/dev/null)
    postgis_status=$(echo "$response" | jq -r '.checks.postgis' 2>/dev/null)

    if [ "$db_status" = "true" ] && [ "$postgis_status" = "true" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Database and PostGIS connected)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Database: $db_status, PostGIS: $postgis_status)"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} (jq not installed)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "7. Component Status"
echo "========================================="
echo ""

# Test component status
echo -n "Testing component status... "
response=$(curl -s "$BACKEND_URL/health/detailed")

if command -v jq &> /dev/null; then
    api_status=$(echo "$response" | jq -r '.components.api.status' 2>/dev/null)
    db_status=$(echo "$response" | jq -r '.components.database.status' 2>/dev/null)
    auth_status=$(echo "$response" | jq -r '.components.authentication.status' 2>/dev/null)

    all_healthy=true
    [ "$api_status" != "healthy" ] && all_healthy=false
    [ "$db_status" != "healthy" ] && all_healthy=false

    if $all_healthy; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "  API: $api_status"
        echo "  Database: $db_status"
        echo "  Auth: $auth_status"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  API: $api_status"
        echo "  Database: $db_status"
        echo "  Auth: $auth_status"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} (jq not installed)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "8. Performance Checks"
echo "========================================="
echo ""

# Test response time
echo -n "Testing response time... "
start=$(date +%s%N)
curl -s "$BACKEND_URL/health" > /dev/null
end=$(date +%s%N)
duration=$(( (end - start) / 1000000 ))

if [ $duration -lt 1000 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (${duration}ms)"
    PASSED=$((PASSED + 1))
elif [ $duration -lt 3000 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} (${duration}ms - should be faster)"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}✗ FAILED${NC} (${duration}ms - too slow)"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "========================================="
echo "9. Security Checks"
echo "========================================="
echo ""

# Check CORS headers
echo -n "Testing CORS headers... "
cors_header=$(curl -s -H "Origin: http://localhost:3000" -I "$BACKEND_URL/health" | grep -i "access-control-allow-origin" || echo "")

if [ -n "$cors_header" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (No CORS headers found)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check if API requires auth for protected endpoints
echo -n "Testing auth protection... "
auth_response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/api/v1/projects")

if [ "$auth_response" = "401" ] || [ "$auth_response" = "403" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Protected endpoints require auth)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Got HTTP $auth_response)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
