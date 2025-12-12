# Monitoring and Observability Guide

This guide explains how to set up and use the monitoring stack for the Scouting Flyers application.

## Overview

The monitoring stack includes:

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization and dashboards
- **Loki** - Log aggregation
- **Promtail** - Log collection agent

## Quick Start

### 1. Start the Monitoring Stack

```bash
# Start application and monitoring together
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Or start monitoring separately
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access the Dashboards

- **Grafana**: http://localhost:3001
  - Default username: `admin`
  - Default password: `admin` (change on first login)

- **Prometheus**: http://localhost:9090
  - No authentication required

### 3. View Pre-configured Dashboards

In Grafana:
1. Navigate to "Dashboards" → "Browse"
2. Open "Flyers Application Overview"
3. View real-time metrics

---

## Metrics Available

### Application Metrics

Collected from `/metrics` endpoint:

| Metric | Description | Type |
|--------|-------------|------|
| `flyers_uptime_seconds` | Application uptime | Gauge |
| `flyers_users_total` | Total number of users | Gauge |
| `flyers_projects_total` | Total number of projects | Gauge |
| `flyers_zones_total` | Total number of zones | Gauge |
| `flyers_assignments_total` | Total zone assignments | Gauge |
| `flyers_assignments_by_status{status}` | Assignments by status | Gauge |

### System Metrics

If cAdvisor or Node Exporter is added:

- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Container statistics

---

## Prometheus Configuration

### Scrape Configurations

**Backend Application Metrics:**
```yaml
scrape_configs:
  - job_name: 'flyers-backend'
    metrics_path: '/metrics'
    scrape_interval: 30s
    static_configs:
      - targets: ['backend:8000']
```

**Health Check Metrics:**
```yaml
  - job_name: 'flyers-health'
    metrics_path: '/health/detailed'
    scrape_interval: 60s
    static_configs:
      - targets: ['backend:8000']
```

### Adding Custom Metrics

Edit `monitoring/prometheus/prometheus.yml` and restart:

```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

---

## Alerts

### Configured Alerts

1. **ApplicationDown** - Application has been down for 2+ minutes
2. **HighErrorRate** - HTTP 5xx errors exceed threshold
3. **DatabaseConnectionFailed** - Cannot connect to database
4. **HighMemoryUsage** - Memory usage > 90%
5. **HighCPUUsage** - CPU usage > 80%
6. **SlowResponseTime** - 95th percentile > 1s
7. **ApplicationRestarted** - Application restarted recently
8. **HighActiveAssignments** - Many in-progress assignments
9. **NoRecentProjectActivity** - No new projects in 7 days

### Alert Configuration

Alerts are defined in `monitoring/prometheus/alerts.yml`.

**To add a new alert:**

1. Edit `monitoring/prometheus/alerts.yml`
2. Add your alert rule:
   ```yaml
   - alert: YourAlertName
     expr: your_metric > threshold
     for: 5m
     labels:
       severity: warning
     annotations:
       summary: "Alert summary"
       description: "Alert description"
   ```
3. Reload Prometheus configuration:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Alert Severity Levels

- **critical** - Immediate action required
- **warning** - Should be investigated soon
- **info** - Informational, no action needed

---

## Grafana Dashboards

### Pre-configured Dashboard

**Flyers Application Overview** includes:

- Application uptime
- User/project/zone counts
- Assignment status breakdown
- Application health gauge
- Historical trends

### Creating Custom Dashboards

1. Log into Grafana (http://localhost:3001)
2. Click "+" → "Dashboard"
3. Click "Add new panel"
4. Select "Prometheus" as data source
5. Enter your PromQL query
6. Configure visualization
7. Save dashboard

### Example Queries

**Total assignments over time:**
```promql
sum(flyers_assignments_total)
```

**Assignment completion rate:**
```promql
sum(flyers_assignments_by_status{status="completed"}) / sum(flyers_assignments_total) * 100
```

**Application uptime in hours:**
```promql
flyers_uptime_seconds / 3600
```

---

## Log Aggregation with Loki

### Viewing Logs in Grafana

1. Go to "Explore" in Grafana
2. Select "Loki" as data source
3. Use LogQL to query logs

### LogQL Examples

**All backend logs:**
```logql
{container_name="flyers-backend"}
```

**Error logs only:**
```logql
{container_name="flyers-backend"} |= "ERROR"
```

**Last 100 lines:**
```logql
{container_name="flyers-backend"} | limit 100
```

**Filter by time range and level:**
```logql
{container_name="flyers-backend"} | json | level="error"
```

---

## Monitoring Environment Variables

Configure in `.env`:

```env
# Grafana Admin Credentials
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_password

# Optional: Alertmanager configuration
ALERTMANAGER_URL=http://alertmanager:9093
```

---

## Customization

### Adding More Dashboards

1. Create JSON file in `monitoring/grafana/dashboards/`
2. Restart Grafana:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart grafana
   ```

### Modifying Scrape Intervals

In `monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s  # Default interval
  evaluation_interval: 15s  # Alert evaluation interval
```

### Adding Node Exporter for Host Metrics

Add to `docker-compose.monitoring.yml`:

```yaml
services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: always
    ports:
      - "9100:9100"
    networks:
      - flyers-network
```

Update Prometheus config to scrape it.

---

## Backup and Persistence

### Data Volumes

- `prometheus-data` - Prometheus time-series database
- `grafana-data` - Grafana dashboards and settings
- `loki-data` - Loki logs storage

### Backup Volumes

```bash
# Backup Prometheus data
docker run --rm -v scouting-flyers_prometheus-data:/data -v $(pwd):/backup ubuntu tar czf /backup/prometheus-backup.tar.gz /data

# Backup Grafana data
docker run --rm -v scouting-flyers_grafana-data:/data -v $(pwd):/backup ubuntu tar czf /backup/grafana-backup.tar.gz /data
```

### Restore Volumes

```bash
# Restore Prometheus
docker run --rm -v scouting-flyers_prometheus-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/prometheus-backup.tar.gz -C /

# Restore Grafana
docker run --rm -v scouting-flyers_grafana-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/grafana-backup.tar.gz -C /
```

---

## Troubleshooting

### Prometheus Not Scraping Metrics

**Check target status:**
http://localhost:9090/targets

**Common issues:**
- Backend container not reachable → Check network connectivity
- Metrics endpoint returns 404 → Verify `/metrics` endpoint exists
- Service discovery failing → Check service names in docker-compose

### Grafana Dashboard Not Loading Data

**Check datasource:**
1. Configuration → Data Sources → Prometheus
2. Click "Test" - should show "Data source is working"

**If failing:**
- Verify Prometheus URL: `http://prometheus:9090`
- Check network connectivity
- Ensure Prometheus container is running

### Loki Not Receiving Logs

**Check Promtail status:**
```bash
docker-compose -f docker-compose.monitoring.yml logs promtail
```

**Verify Loki API:**
```bash
curl http://localhost:3100/ready
```

**Common issues:**
- Docker socket permissions → Ensure Promtail has access
- Log path incorrect → Check `__path__` in promtail-config.yml

### High Memory Usage

**Reduce retention period in Prometheus:**

Add to command in `docker-compose.monitoring.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=15d'  # Default is 15 days
```

**Limit Grafana query range:**

In Grafana settings, set default time range to last 6 hours.

---

## Performance Tuning

### Prometheus

**Reduce scrape frequency:**
```yaml
global:
  scrape_interval: 60s  # Instead of 15s
```

**Limit scrape targets:**
Only scrape essential metrics, comment out unnecessary jobs.

### Grafana

**Enable caching:**
```yaml
environment:
  - GF_DATABASE_CACHE_MODE=shared
```

**Limit concurrent users:**
```yaml
environment:
  - GF_USERS_VIEWERS_CAN_EDIT=false
```

---

## Integration with External Services

### Slack Alerts

1. Create Slack webhook
2. Configure Alertmanager (not included by default)
3. Add to `docker-compose.monitoring.yml`:
   ```yaml
   services:
     alertmanager:
       image: prom/alertmanager:latest
       ports:
         - "9093:9093"
       volumes:
         - ./monitoring/alertmanager:/etc/alertmanager
   ```

### PagerDuty Integration

Configure in Alertmanager to send critical alerts to PagerDuty.

### Email Alerts

Set up SMTP in Alertmanager configuration.

---

## Monitoring Best Practices

1. **Set appropriate alert thresholds** - Not too sensitive
2. **Use meaningful alert descriptions** - Include troubleshooting steps
3. **Regularly review dashboards** - Identify trends
4. **Set up retention policies** - Balance storage vs history
5. **Test alerts** - Ensure they fire correctly
6. **Document custom metrics** - Explain what they measure
7. **Monitor the monitors** - Ensure monitoring stack is healthy
8. **Regular backups** - Backup Grafana dashboards and Prometheus data

---

## Security

### Securing Grafana

1. Change default admin password
2. Enable HTTPS
3. Configure authentication (OAuth, LDAP)
4. Restrict dashboard editing permissions

### Securing Prometheus

1. Enable basic authentication (requires additional config)
2. Use reverse proxy with auth
3. Restrict access by IP
4. Use read-only API access where possible

### Network Security

```yaml
networks:
  flyers-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

Restrict external access to monitoring ports in production.

---

## Next Steps

1. Review pre-configured alerts and adjust thresholds
2. Create custom dashboards for your specific needs
3. Set up alerting notifications (Slack, email, PagerDuty)
4. Configure log retention policies
5. Set up automated backups of monitoring data
6. Create runbooks for common alert scenarios
7. Train team on using Grafana and interpreting metrics

---

## Support

For monitoring issues:

1. Check container logs: `docker-compose -f docker-compose.monitoring.yml logs`
2. Verify connectivity between services
3. Review Prometheus targets: http://localhost:9090/targets
4. Test Grafana datasources: Configuration → Data Sources
5. Consult official documentation:
   - [Prometheus Docs](https://prometheus.io/docs/)
   - [Grafana Docs](https://grafana.com/docs/)
   - [Loki Docs](https://grafana.com/docs/loki/)
