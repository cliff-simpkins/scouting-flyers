# Deployment Testing Guide

This guide provides comprehensive testing procedures for validating the Docker deployment of the Scouting Flyers application.

## Quick Start

### Automated Testing

Run the automated test script to validate the deployment:

**Linux/Mac:**
```bash
chmod +x test-deployment.sh
./test-deployment.sh
```

**Windows:**
```cmd
test-deployment.bat
```

The script will test:
- Container status and health
- All health check endpoints
- API endpoints
- Frontend availability
- Database connectivity
- Component status
- Response times
- Security configurations

---

## Manual Testing Checklist

### 1. Pre-Deployment Checks

Before deploying, verify:

- [ ] `.env` file exists with all required variables
- [ ] Google OAuth credentials are configured
- [ ] Database is accessible (if external)
- [ ] All migration scripts have been run
- [ ] Docker and Docker Compose are installed

### 2. Deployment

Start the containers:

```bash
docker-compose up -d
```

Expected output:
```
Creating network "flyers-network" with the default driver
Creating flyers-backend  ... done
Creating flyers-frontend ... done
Creating flyers-nginx    ... done
```

### 3. Container Health Verification

Check that all containers are running:

```bash
docker-compose ps
```

Expected output:
```
      Name                    Command               State                    Ports
------------------------------------------------------------------------------------------------
flyers-backend    gunicorn app.main:app ...   Up (healthy)   8000/tcp
flyers-frontend   /docker-entrypoint.sh ngi...   Up          80/tcp
flyers-nginx      /docker-entrypoint.sh ngin...   Up          0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

**Check Health Status:**

```bash
docker inspect flyers-backend | grep -A 5 "Health"
```

Backend should show `"Status": "healthy"` after the start period (40 seconds).

### 4. Log Verification

Check logs for errors:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

**Look for:**
- ✅ "Application startup complete"
- ✅ "Uvicorn running on http://0.0.0.0:8000"
- ❌ No connection errors
- ❌ No authentication errors
- ❌ No database errors

### 5. Health Endpoint Testing

Test each health endpoint:

**Liveness:**
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T12:34:56.789Z"
}
```

**Readiness:**
```bash
curl http://localhost:8000/health/ready
```

Expected response:
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

**Detailed:**
```bash
curl http://localhost:8000/health/detailed | jq
```

Verify all components show `"status": "healthy"`.

**Metrics:**
```bash
curl http://localhost:8000/metrics
```

Should return Prometheus-format metrics.

### 6. API Endpoint Testing

**Root Endpoint:**
```bash
curl http://localhost:8000/
```

Expected:
```json
{
  "message": "Volunteer Flyer Distribution API",
  "version": "1.0.0",
  "docs": "/api/v1/docs"
}
```

**API Documentation:**

Open in browser: `http://localhost:8000/api/v1/docs`

You should see the interactive Swagger UI.

**Test Protected Endpoint:**
```bash
curl -i http://localhost:8000/api/v1/projects
```

Should return HTTP 401 (Unauthorized) without authentication.

### 7. Frontend Testing

**Test Frontend Loading:**

Open in browser: `http://localhost/`

- [ ] Page loads without errors
- [ ] Login button is visible
- [ ] No console errors in browser DevTools
- [ ] Static assets load correctly

**Test Routing:**

- [ ] `http://localhost/` - Login page
- [ ] `http://localhost/dashboard` - Redirects to login if not authenticated

### 8. Authentication Flow Testing

**Google OAuth:**

1. Click "Sign in with Google"
2. Should redirect to Google OAuth consent screen
3. After authentication, should redirect back to application
4. Should land on dashboard

**Error Cases:**

- Test with invalid credentials
- Test OAuth callback with invalid state
- Verify error messages are user-friendly

### 9. Database Connectivity Testing

**From Backend Container:**

```bash
docker-compose exec backend python -c "from app.database import engine; engine.connect(); print('✓ Database connected')"
```

**Direct Database Test:**

```bash
# If using external database
psql -h YOUR_DB_HOST -p YOUR_DB_PORT -U flyers_user -d flyers_db -c "SELECT PostGIS_version();"
```

### 10. Performance Testing

**Response Time:**

```bash
time curl http://localhost:8000/health
```

Should complete in < 100ms for health check.

**Load Test (Optional):**

Using Apache Bench:
```bash
ab -n 1000 -c 10 http://localhost:8000/health
```

**Memory Usage:**

```bash
docker stats --no-stream
```

Check that containers aren't using excessive memory.

### 11. Security Testing

**CORS Verification:**

```bash
curl -H "Origin: http://localhost:3000" -I http://localhost:8000/health
```

Should include CORS headers if origin is allowed.

**SSL/TLS (Production):**

```bash
curl -I https://yourdomain.com/
```

Verify SSL certificate is valid.

**Protected Routes:**

Try accessing:
- `/api/v1/projects` - Should require auth
- `/api/v1/zones` - Should require auth
- `/health` - Should be public

### 12. Functional Testing

**End-to-End User Workflows:**

1. **Organizer Flow:**
   - [ ] Create new project
   - [ ] Import zones from KML
   - [ ] Invite collaborators
   - [ ] Assign zones to volunteers
   - [ ] View progress dashboard

2. **Volunteer Flow:**
   - [ ] Accept invitation
   - [ ] View assigned zones
   - [ ] Mark houses as visited
   - [ ] Update completion percentage
   - [ ] Add notes

### 13. Monitoring Integration Testing

**Prometheus Scraping:**

If Prometheus is configured:

```bash
curl http://localhost:9090/api/v1/targets
```

Verify the `flyers-app` target is UP.

**Metrics Validation:**

```bash
curl http://localhost:8000/metrics | grep flyers_uptime_seconds
```

Should show current uptime.

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Database connection refused → Check DB_HOST and DB_PORT in `.env`
- Missing environment variables → Verify `.env` file
- Port already in use → Change port mapping in `docker-compose.yml`

### Health Check Failing

**Check readiness endpoint:**
```bash
curl http://localhost:8000/health/ready
```

**If database check fails:**
1. Verify database is running
2. Check connection string in `.env`
3. Ensure PostGIS extension is installed
4. Verify database user has permissions

### Frontend Not Loading

**Check nginx logs:**
```bash
docker-compose logs nginx
```

**Common issues:**
- Backend not responding → Check backend health
- CORS errors → Verify CORS_ORIGINS in `.env`
- Static files not found → Rebuild frontend container

### Authentication Not Working

**Check OAuth configuration:**
1. Verify `GOOGLE_CLIENT_ID` in `.env`
2. Check `GOOGLE_REDIRECT_URI` matches OAuth settings
3. Ensure redirect URI is whitelisted in Google Console
4. Check backend logs for OAuth errors

---

## Performance Benchmarks

### Expected Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Health check response | < 100ms | < 500ms | > 1s |
| API response time | < 200ms | < 1s | > 3s |
| Frontend load time | < 2s | < 5s | > 10s |
| Container memory (backend) | < 512MB | < 1GB | > 2GB |
| Container memory (frontend) | < 128MB | < 256MB | > 512MB |

### Load Testing Results

Document your load testing results:

```bash
# Run load test
ab -n 10000 -c 100 http://localhost:8000/health > load-test-results.txt

# Analyze results
cat load-test-results.txt
```

---

## Acceptance Criteria

Before declaring deployment successful, verify:

- [ ] All containers are running and healthy
- [ ] All health endpoints return 200
- [ ] Database connectivity confirmed
- [ ] Frontend loads without errors
- [ ] Authentication flow works
- [ ] API documentation accessible
- [ ] Metrics endpoint returning data
- [ ] No critical errors in logs
- [ ] Response times within acceptable range
- [ ] Protected endpoints require authentication
- [ ] CORS configured correctly

---

## Continuous Monitoring

After deployment, set up monitoring for:

1. **Container Health:**
   - Monitor `/health/ready` endpoint
   - Alert on consecutive failures

2. **Performance:**
   - Track response times
   - Monitor resource usage
   - Set up Prometheus alerts

3. **Errors:**
   - Monitor application logs
   - Alert on error rate spikes
   - Track failed authentication attempts

4. **Database:**
   - Monitor connection pool
   - Track query performance
   - Alert on connection failures

---

## Rollback Procedure

If deployment fails:

1. **Stop containers:**
   ```bash
   docker-compose down
   ```

2. **Check logs for issues:**
   ```bash
   docker-compose logs > deployment-failure.log
   ```

3. **Restore previous version:**
   ```bash
   git checkout <previous-tag>
   docker-compose up -d
   ```

4. **Verify rollback:**
   ```bash
   ./test-deployment.sh
   ```

---

## Next Steps

After successful deployment:

1. Share access with testers
2. Provide onboarding documentation
3. Set up monitoring dashboards
4. Configure automated backups
5. Schedule regular health checks
6. Plan for scaling if needed

---

## Support

For issues during testing:

1. Check logs: `docker-compose logs -f`
2. Review documentation: `README.md`, `DOCKER_SETUP.md`
3. Test health endpoints: `curl http://localhost:8000/health/detailed`
4. Verify database: Check `docs/DATABASE.md`
5. Create GitHub issue with logs and error details
