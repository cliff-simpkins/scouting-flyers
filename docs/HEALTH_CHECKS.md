# Health Check Endpoints

The application provides multiple health check endpoints for monitoring, container orchestration, and observability.

## Endpoints Overview

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Liveness probe | Kubernetes/Docker liveness check |
| `/health/ready` | Readiness probe | Load balancer routing decisions |
| `/health/detailed` | Detailed status | Monitoring dashboards |
| `/health/startup` | Startup probe | Container initialization |
| `/metrics` | Prometheus metrics | Metrics scraping |

## Endpoint Details

### `/health` - Liveness Probe

**Purpose:** Determine if the application process is running and responsive.

**Response:** HTTP 200 if alive

```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T12:34:56.789Z"
}
```

**Docker Compose Usage:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
```

**Kubernetes Usage:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

### `/health/ready` - Readiness Probe

**Purpose:** Determine if the application is ready to accept traffic.

**Checks:**
- Database connectivity
- PostGIS extension availability

**Response:** HTTP 200 if ready, with check details

```json
{
  "status": "ready",
  "checks": {
    "database": true,
    "postgis": true,
    "postgis_version": "3.4.0"
  },
  "timestamp": "2025-01-09T12:34:56.789Z"
}
```

**Failure Response:**
```json
{
  "status": "not_ready",
  "checks": {
    "database": false,
    "postgis": false
  },
  "error": "connection refused",
  "timestamp": "2025-01-09T12:34:56.789Z"
}
```

**Docker Compose Usage:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Kubernetes Usage:**
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 20
  periodSeconds: 10
  failureThreshold: 3
```

---

### `/health/detailed` - Detailed Status

**Purpose:** Comprehensive health check for monitoring dashboards and debugging.

**Provides:**
- Application version and uptime
- Component-level status (API, database, auth, CORS)
- Database statistics (user count, project count, etc.)
- Extension versions (PostGIS, pgvector)

**Response:** HTTP 200 with detailed information

```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T12:34:56.789Z",
  "version": "1.0.0",
  "uptime_seconds": 3600.5,
  "start_time": "2025-01-09T11:34:56.289Z",
  "components": {
    "api": {
      "status": "healthy",
      "version": "1.0.0",
      "debug_mode": false
    },
    "database": {
      "status": "healthy",
      "connected": true,
      "version": "PostgreSQL 17.0",
      "postgis_version": "3.4.0",
      "pgvector_version": "0.7.4",
      "stats": {
        "users": 42,
        "projects": 15,
        "zones": 123,
        "assignments": 89
      }
    },
    "authentication": {
      "status": "healthy",
      "google_oauth_configured": true,
      "jwt_algorithm": "HS256"
    },
    "cors": {
      "status": "healthy",
      "allowed_origins": ["https://yourdomain.com"]
    }
  }
}
```

**Use Cases:**
- Monitoring dashboards (Grafana, DataDog)
- Admin debugging panels
- Automated health reports

---

### `/health/startup` - Startup Probe

**Purpose:** Verify application has completed initialization.

**Checks:**
- Database connection
- Critical tables exist (users, projects, zones, zone_assignments)

**Response:** HTTP 200 when started

```json
{
  "status": "started",
  "timestamp": "2025-01-09T12:34:56.789Z",
  "message": "Application has successfully started"
}
```

**During Startup:**
```json
{
  "status": "starting",
  "timestamp": "2025-01-09T12:34:56.789Z",
  "error": "table not found",
  "message": "Application is still starting up"
}
```

**Kubernetes Usage:**
```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8000
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30
```

---

### `/metrics` - Prometheus Metrics

**Purpose:** Export metrics in Prometheus-compatible format for scraping.

**Metrics Provided:**
- `flyers_uptime_seconds` - Application uptime
- `flyers_users_total` - Total users
- `flyers_projects_total` - Total projects
- `flyers_zones_total` - Total zones
- `flyers_assignments_total` - Total assignments
- `flyers_assignments_by_status{status}` - Assignments by status

**Response:** Plain text Prometheus format

```
# HELP flyers_uptime_seconds Application uptime in seconds
# TYPE flyers_uptime_seconds gauge
flyers_uptime_seconds 3600.5

# HELP flyers_users_total Total number of users
# TYPE flyers_users_total gauge
flyers_users_total 42

# HELP flyers_projects_total Total number of projects
# TYPE flyers_projects_total gauge
flyers_projects_total 15

# HELP flyers_assignments_by_status Number of assignments by status
# TYPE flyers_assignments_by_status gauge
flyers_assignments_by_status{status="assigned"} 30
flyers_assignments_by_status{status="in_progress"} 45
flyers_assignments_by_status{status="completed"} 14
```

**Prometheus Configuration:**
```yaml
scrape_configs:
  - job_name: 'flyers-app'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

---

## Monitoring Best Practices

### Container Orchestration

1. **Liveness Probe:** Use `/health` to restart unhealthy containers
2. **Readiness Probe:** Use `/health/ready` to remove from load balancer
3. **Startup Probe:** Use `/health/startup` for slow-starting apps

### Alerting

Monitor `/health/ready` failures for critical alerts:
- Database connection failures
- Extension unavailability
- Persistent unhealthy status

### Observability

1. **Dashboard:** Use `/health/detailed` for real-time status
2. **Metrics:** Scrape `/metrics` every 30-60 seconds
3. **Logging:** All health check failures are logged

---

## Troubleshooting

### Health Check Failing

**Check logs:**
```bash
docker-compose logs backend
```

**Test endpoint manually:**
```bash
curl http://localhost:8000/health/ready
```

**Common Issues:**
- Database connection refused → Check DB_HOST and DB_PORT
- PostGIS not found → Ensure PostGIS extension installed
- Timeout → Increase start_period in health check

### Database Connection Issues

**Verify database connectivity:**
```bash
psql -h DB_HOST -p DB_PORT -U flyers_user -d flyers_db -c "SELECT 1"
```

**Check PostGIS:**
```bash
psql -h DB_HOST -p DB_PORT -U flyers_user -d flyers_db -c "SELECT PostGIS_version()"
```

---

## Integration Examples

### Docker Compose

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: backend
    livenessProbe:
      httpGet:
        path: /health
        port: 8000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8000
      initialDelaySeconds: 20
      periodSeconds: 10
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8000
      failureThreshold: 30
      periodSeconds: 10
```

### Nginx Health Check

```nginx
upstream backend {
    server backend:8000 max_fails=3 fail_timeout=30s;
    check interval=3000 rise=2 fall=5 timeout=1000 type=http;
    check_http_send "GET /health/ready HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}
```

---

## Security Considerations

- Health check endpoints are **public** (no authentication)
- Do **not** expose sensitive data in responses
- Use HTTPS in production
- Rate limit health check endpoints if exposed publicly
- Consider separate internal/external health endpoints for production

